package back.backend.domain.trip.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import back.backend.domain.trip.entity.GuestSession;
import back.backend.domain.trip.entity.Trip;
import back.backend.domain.trip.entity.TripGuestMember;
import back.backend.domain.trip.entity.TripInvitation;
import back.backend.domain.trip.entity.TripMember;
import back.backend.domain.trip.entity.TripStatus;
import back.backend.domain.trip.exception.TripErrorCode;
import back.backend.domain.trip.repository.GuestSessionRepository;
import back.backend.domain.trip.repository.TripGuestMemberRepository;
import back.backend.domain.trip.repository.TripInvitationRepository;
import back.backend.domain.trip.repository.TripMemberRepository;
import back.backend.domain.trip.repository.TripRepository;
import back.backend.global.exception.BusinessException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.context.ApplicationEventPublisher;
import back.backend.global.realtime.RealtimeEvent;

@ExtendWith(MockitoExtension.class)
class GuestTripAccessServiceTest {

    @Mock TripInvitationRepository invitationRepository;
    @Mock TripRepository tripRepository;
    @Mock GuestSessionRepository guestSessionRepository;
    @Mock TripGuestMemberRepository tripGuestMemberRepository;
    @Mock TripMemberRepository tripMemberRepository;
    @Mock ApplicationEventPublisher eventPublisher;

    private GuestTripAccessService service;
    private final GuestTokenHasher tokenHasher = new GuestTokenHasher();

    @BeforeEach
    void setUp() {
        service = new GuestTripAccessService(invitationRepository, tripRepository, guestSessionRepository,
                tripGuestMemberRepository, tripMemberRepository, tokenHasher, eventPublisher);
    }

    @Test
    @DisplayName("t1 유효한 초대 코드를 수락하면 원문 토큰을 저장하지 않고 조회 전용 게스트 접근을 생성한다")
    void t1_acceptCreatesHashedGuestViewerAccess() {
        TripInvitation invitation = invitation();
        Trip trip = trip();
        ReflectionTestUtils.setField(trip, "id", 10L);
        when(invitationRepository.findByInviteCode("invite-token")).thenReturn(Optional.of(invitation));
        when(tripRepository.findByIdAndStatusNot(10L, TripStatus.CANCELLED)).thenReturn(Optional.of(trip));
        when(guestSessionRepository.save(any())).thenAnswer(invocation -> {
            GuestSession session = invocation.getArgument(0);
            ReflectionTestUtils.setField(session, "id", 20L);
            return session;
        });

        var grant = service.accept("invite-token", "123456", null);

        ArgumentCaptor<GuestSession> sessionCaptor = ArgumentCaptor.forClass(GuestSession.class);
        verify(guestSessionRepository).save(sessionCaptor.capture());
        assertThat(sessionCaptor.getValue().getTokenHash()).isEqualTo(tokenHasher.hash(grant.token()));
        assertThat(sessionCaptor.getValue().getTokenHash()).isNotEqualTo(grant.token());
        ArgumentCaptor<TripGuestMember> accessCaptor = ArgumentCaptor.forClass(TripGuestMember.class);
        verify(tripGuestMemberRepository).save(accessCaptor.capture());
        assertThat(accessCaptor.getValue().getTripId()).isEqualTo(10L);
        assertThat(accessCaptor.getValue().getGuestSessionId()).isEqualTo(20L);
    }

    @Test
    @DisplayName("t2 게스트 토큰이 해당 여행방 조회 권한을 가지면 여행방을 조회한다")
    void t2_getTripAllowsMatchingGuestAccess() {
        GuestSession session = guestSession();
        Trip trip = trip();
        when(guestSessionRepository.findByTokenHash(tokenHasher.hash("guest-token")))
                .thenReturn(Optional.of(session));
        when(tripGuestMemberRepository.existsByTripIdAndGuestSessionId(10L, 20L)).thenReturn(true);
        when(tripRepository.findByIdAndStatusNot(10L, TripStatus.CANCELLED)).thenReturn(Optional.of(trip));

        assertThat(service.getTrip(10L, "guest-token").title()).isEqualTo("제주 여행");
    }

    @Test
    @DisplayName("t3 게스트 토큰이 다른 여행방에 사용되면 조회를 거부한다")
    void t3_getTripRejectsGuestWithoutMatchingAccess() {
        GuestSession session = guestSession();
        when(guestSessionRepository.findByTokenHash(tokenHasher.hash("guest-token")))
                .thenReturn(Optional.of(session));
        when(tripGuestMemberRepository.existsByTripIdAndGuestSessionId(99L, 20L)).thenReturn(false);

        assertThatThrownBy(() -> service.getTrip(99L, "guest-token"))
                .isInstanceOfSatisfying(BusinessException.class,
                        exception -> assertThat(exception.getErrorCode()).isEqualTo(TripErrorCode.GUEST_ACCESS_DENIED));
    }

    @Test
    @DisplayName("t4 로그인 시 게스트 접근을 정식 여행방 멤버십으로 이전하고 게스트 접근을 폐기한다")
    void t4_claimMovesGuestAccessToMemberViewer() {
        GuestSession session = guestSession();
        TripGuestMember access = TripGuestMember.guest(10L, 20L);
        when(guestSessionRepository.findByTokenHash(tokenHasher.hash("guest-token")))
                .thenReturn(Optional.of(session));
        when(tripGuestMemberRepository.findAllByGuestSessionId(20L)).thenReturn(List.of(access));
        when(tripMemberRepository.existsByTripIdAndMemberId(10L, 1L)).thenReturn(false);

        assertThat(service.claimIfPresent(1L, "guest-token")).isTrue();

        ArgumentCaptor<TripMember> memberCaptor = ArgumentCaptor.forClass(TripMember.class);
        verify(tripMemberRepository).save(memberCaptor.capture());
        assertThat(memberCaptor.getValue().getTripId()).isEqualTo(10L);
        assertThat(memberCaptor.getValue().getMemberId()).isEqualTo(1L);
        verify(tripGuestMemberRepository).deleteAllByGuestSessionId(20L);
        assertThat(session.getClaimedAt()).isNotNull();
    }

    @Test
    @DisplayName("t5 이미 여행방 회원이면 멤버십을 중복 생성하지 않고 게스트 접근만 폐기한다")
    void t5_claimPreservesExistingMemberRole() {
        GuestSession session = guestSession();
        when(guestSessionRepository.findByTokenHash(tokenHasher.hash("guest-token")))
                .thenReturn(Optional.of(session));
        when(tripGuestMemberRepository.findAllByGuestSessionId(20L))
                .thenReturn(List.of(TripGuestMember.guest(10L, 20L)));
        when(tripMemberRepository.existsByTripIdAndMemberId(10L, 1L)).thenReturn(true);

        assertThat(service.claimIfPresent(1L, "guest-token")).isTrue();

        verify(tripMemberRepository, never()).save(any());
        verify(tripGuestMemberRepository).deleteAllByGuestSessionId(20L);
    }

    @Test
    @DisplayName("t6 유효한 게스트 쿠키로 초대를 다시 수락하면 기존 세션을 재사용한다")
    void t6_acceptReusesExistingGuestSession() {
        TripInvitation invitation = invitation();
        GuestSession session = guestSession();
        Trip trip = trip();
        ReflectionTestUtils.setField(trip, "id", 10L);
        when(invitationRepository.findByInviteCode("invite-token")).thenReturn(Optional.of(invitation));
        when(tripRepository.findByIdAndStatusNot(10L, TripStatus.CANCELLED)).thenReturn(Optional.of(trip));
        when(guestSessionRepository.findByTokenHash(tokenHasher.hash("guest-token")))
                .thenReturn(Optional.of(session));
        when(tripGuestMemberRepository.existsByTripIdAndGuestSessionId(10L, 20L)).thenReturn(true);

        var grant = service.accept("invite-token", null, "guest-token");

        assertThat(grant.token()).isEqualTo("guest-token");
        verify(guestSessionRepository, never()).save(any());
        verify(tripGuestMemberRepository, never()).save(any());
    }

    @Test
    @DisplayName("t7 유효한 게스트 세션이 해당 여행방에 속하면 조회 권한을 반환한다")
    void t7_canViewReturnsTrueForAuthorizedGuest() {
        GuestSession session = guestSession();
        when(guestSessionRepository.findByTokenHash(tokenHasher.hash("guest-token")))
                .thenReturn(Optional.of(session));
        when(tripGuestMemberRepository.existsByTripIdAndGuestSessionId(10L, 20L))
                .thenReturn(true);

        assertThat(service.canView(10L, "guest-token")).isTrue();
    }

    @Test
    @DisplayName("t8 게스트 쿠키가 없어도 유효한 초대 코드로 로그인 회원을 여행방에 추가한다")
    void t8_claimInvitationAddsMemberWithoutGuestCookie() {
        TripInvitation invitation = invitation();
        Trip trip = trip();
        ReflectionTestUtils.setField(trip, "id", 10L);
        when(invitationRepository.findByInviteCode("invite-token"))
                .thenReturn(Optional.of(invitation));
        when(tripRepository.findByIdAndStatusNot(10L, TripStatus.CANCELLED))
                .thenReturn(Optional.of(trip));
        when(tripMemberRepository.existsByTripIdAndMemberId(10L, 2L))
                .thenReturn(false);

        service.claimInvitation(2L, "invite-token", null);

        ArgumentCaptor<TripMember> memberCaptor =
                ArgumentCaptor.forClass(TripMember.class);
        verify(tripMemberRepository).save(memberCaptor.capture());
        assertThat(memberCaptor.getValue().getTripId()).isEqualTo(10L);
        assertThat(memberCaptor.getValue().getMemberId()).isEqualTo(2L);
        verify(eventPublisher).publishEvent(any(RealtimeEvent.class));
    }

    @Test
    @DisplayName("t9 새 게스트 권한은 초대 링크 만료와 무관하게 수락 시점부터 7일간 유지된다")
    void t9_acceptCreatesSevenDayGuestSession() {
        Trip trip = trip();
        ReflectionTestUtils.setField(trip, "id", 10L);
        when(invitationRepository.findByInviteCode("invite-token")).thenReturn(Optional.of(invitation()));
        when(tripRepository.findByIdAndStatusNot(10L, TripStatus.CANCELLED)).thenReturn(Optional.of(trip));
        when(guestSessionRepository.save(any())).thenAnswer(invocation -> {
            GuestSession session = invocation.getArgument(0);
            ReflectionTestUtils.setField(session, "id", 20L);
            return session;
        });

        var grant = service.accept("invite-token", "123456", null);

        assertThat(grant.expiresAt()).isAfter(LocalDateTime.now().plusDays(6));
    }

    @Test
    @DisplayName("t10 기존 게스트 권한이 있으면 만료된 링크와 코드 없이 같은 여행방에 재접속한다")
    void t10_existingGuestReentersAfterInvitationExpiration() {
        TripInvitation expired = TripInvitation.create(
                10L, "invite-token", "123456", 1L,
                LocalDateTime.now().minusMinutes(1), LocalDateTime.now().minusMinutes(1));
        GuestSession session = guestSession();
        Trip trip = trip();
        ReflectionTestUtils.setField(trip, "id", 10L);
        when(invitationRepository.findByInviteCode("invite-token")).thenReturn(Optional.of(expired));
        when(guestSessionRepository.findByTokenHash(tokenHasher.hash("guest-token")))
                .thenReturn(Optional.of(session));
        when(tripGuestMemberRepository.existsByTripIdAndGuestSessionId(10L, 20L)).thenReturn(true);
        when(tripRepository.findByIdAndStatusNot(10L, TripStatus.CANCELLED)).thenReturn(Optional.of(trip));

        assertThat(service.accept("invite-token", null, "guest-token").trip().title()).isEqualTo("제주 여행");
    }

    @Test
    @DisplayName("t11 이미 여행방에 소속된 계정으로 게스트 전환을 시도하면 중복 참여 예외를 반환한다")
    void t11_claimInvitationRejectsExistingMember() {
        TripInvitation invitation = invitation();
        GuestSession session = guestSession();
        Trip trip = trip();
        ReflectionTestUtils.setField(trip, "id", 10L);
        when(invitationRepository.findByInviteCode("invite-token"))
                .thenReturn(Optional.of(invitation));
        when(guestSessionRepository.findByTokenHash(tokenHasher.hash("guest-token")))
                .thenReturn(Optional.of(session));
        when(tripGuestMemberRepository.existsByTripIdAndGuestSessionId(10L, 20L))
                .thenReturn(true);
        when(tripRepository.findByIdAndStatusNot(10L, TripStatus.CANCELLED))
                .thenReturn(Optional.of(trip));
        when(tripMemberRepository.existsByTripIdAndMemberId(10L, 1L))
                .thenReturn(true);

        assertThatThrownBy(() -> service.claimInvitation(1L, "invite-token", "guest-token"))
                .isInstanceOf(BusinessException.class)
                .satisfies(exception -> assertThat(((BusinessException) exception).getErrorCode())
                        .isEqualTo(TripErrorCode.INVITEE_ALREADY_MEMBER));

        verify(tripGuestMemberRepository, never()).deleteAllByGuestSessionId(20L);
    }

    @Test
    @DisplayName("t12 게스트 쿠키가 없으면 초대 접근 상태를 예외 없이 false로 반환한다")
    void t12_hasInvitationGuestAccessReturnsFalseWithoutCookie() {
        assertThat(service.hasInvitationGuestAccess("invite-token", null)).isFalse();
    }

    private TripInvitation invitation() {
        return TripInvitation.create(
                10L, "invite-token", "123456", 1L,
                LocalDateTime.now().plusMinutes(5), LocalDateTime.now().plusDays(7));
    }

    private GuestSession guestSession() {
        GuestSession session = GuestSession.create(
                tokenHasher.hash("guest-token"), LocalDateTime.now().plusDays(1));
        ReflectionTestUtils.setField(session, "id", 20L);
        return session;
    }

    private Trip trip() {
        return Trip.create(1L, "제주 여행", null, Set.of(), null, null, null);
    }
}
