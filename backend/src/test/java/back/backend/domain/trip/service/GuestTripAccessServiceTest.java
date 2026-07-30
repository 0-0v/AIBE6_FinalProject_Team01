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

@ExtendWith(MockitoExtension.class)
class GuestTripAccessServiceTest {

    @Mock TripInvitationRepository invitationRepository;
    @Mock TripRepository tripRepository;
    @Mock GuestSessionRepository guestSessionRepository;
    @Mock TripGuestMemberRepository tripGuestMemberRepository;
    @Mock TripMemberRepository tripMemberRepository;

    private GuestTripAccessService service;
    private final GuestTokenHasher tokenHasher = new GuestTokenHasher();

    @BeforeEach
    void setUp() {
        service = new GuestTripAccessService(invitationRepository, tripRepository, guestSessionRepository,
                tripGuestMemberRepository, tripMemberRepository, tokenHasher);
    }

    @Test
    @DisplayName("t1 유효한 초대 코드를 수락하면 원문 토큰을 저장하지 않고 VIEWER 게스트 권한을 생성한다")
    void t1_acceptCreatesHashedGuestViewerAccess() {
        TripInvitation invitation = TripInvitation.create(
                10L, "invite-code", 1L, LocalDateTime.now().plusDays(1));
        Trip trip = trip();
        ReflectionTestUtils.setField(trip, "id", 10L);
        when(invitationRepository.findByInviteCode("invite-code")).thenReturn(Optional.of(invitation));
        when(tripRepository.findByIdAndStatusNot(10L, TripStatus.CANCELLED)).thenReturn(Optional.of(trip));
        when(guestSessionRepository.save(any())).thenAnswer(invocation -> {
            GuestSession session = invocation.getArgument(0);
            ReflectionTestUtils.setField(session, "id", 20L);
            return session;
        });

        var grant = service.accept("invite-code");

        ArgumentCaptor<GuestSession> sessionCaptor = ArgumentCaptor.forClass(GuestSession.class);
        verify(guestSessionRepository).save(sessionCaptor.capture());
        assertThat(sessionCaptor.getValue().getTokenHash()).isEqualTo(tokenHasher.hash(grant.token()));
        assertThat(sessionCaptor.getValue().getTokenHash()).isNotEqualTo(grant.token());
        ArgumentCaptor<TripGuestMember> accessCaptor = ArgumentCaptor.forClass(TripGuestMember.class);
        verify(tripGuestMemberRepository).save(accessCaptor.capture());
        assertThat(accessCaptor.getValue().getRole().name()).isEqualTo("VIEWER");
    }

    @Test
    @DisplayName("t2 게스트 토큰이 해당 여행방 VIEWER 권한을 가지면 여행방을 조회한다")
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
    @DisplayName("t4 로그인 시 게스트 권한을 VIEWER 회원 권한으로 이전하고 게스트 접근을 폐기한다")
    void t4_claimMovesGuestAccessToMemberViewer() {
        GuestSession session = guestSession();
        TripGuestMember access = TripGuestMember.viewer(10L, 20L);
        when(guestSessionRepository.findByTokenHash(tokenHasher.hash("guest-token")))
                .thenReturn(Optional.of(session));
        when(tripGuestMemberRepository.findAllByGuestSessionId(20L)).thenReturn(List.of(access));
        when(tripMemberRepository.existsByTripIdAndMemberId(10L, 1L)).thenReturn(false);

        assertThat(service.claimIfPresent(1L, "guest-token")).isTrue();

        ArgumentCaptor<TripMember> memberCaptor = ArgumentCaptor.forClass(TripMember.class);
        verify(tripMemberRepository).save(memberCaptor.capture());
        assertThat(memberCaptor.getValue().getRole().name()).isEqualTo("VIEWER");
        verify(tripGuestMemberRepository).deleteAllByGuestSessionId(20L);
        assertThat(session.getClaimedAt()).isNotNull();
    }

    @Test
    @DisplayName("t5 이미 여행방 회원이면 기존 역할을 덮어쓰지 않고 게스트 접근만 폐기한다")
    void t5_claimPreservesExistingMemberRole() {
        GuestSession session = guestSession();
        when(guestSessionRepository.findByTokenHash(tokenHasher.hash("guest-token")))
                .thenReturn(Optional.of(session));
        when(tripGuestMemberRepository.findAllByGuestSessionId(20L))
                .thenReturn(List.of(TripGuestMember.viewer(10L, 20L)));
        when(tripMemberRepository.existsByTripIdAndMemberId(10L, 1L)).thenReturn(true);

        assertThat(service.claimIfPresent(1L, "guest-token")).isTrue();

        verify(tripMemberRepository, never()).save(any());
        verify(tripGuestMemberRepository).deleteAllByGuestSessionId(20L);
    }

    @Test
    @DisplayName("t6 유효한 게스트 쿠키로 초대를 다시 수락하면 기존 세션을 재사용한다")
    void t6_acceptReusesExistingGuestSession() {
        TripInvitation invitation = TripInvitation.create(
                10L, "invite-code", 1L, LocalDateTime.now().plusDays(1));
        GuestSession session = guestSession();
        Trip trip = trip();
        ReflectionTestUtils.setField(trip, "id", 10L);
        when(invitationRepository.findByInviteCode("invite-code")).thenReturn(Optional.of(invitation));
        when(tripRepository.findByIdAndStatusNot(10L, TripStatus.CANCELLED)).thenReturn(Optional.of(trip));
        when(guestSessionRepository.findByTokenHash(tokenHasher.hash("guest-token")))
                .thenReturn(Optional.of(session));
        when(tripGuestMemberRepository.existsByTripIdAndGuestSessionId(10L, 20L)).thenReturn(true);

        var grant = service.accept("invite-code", "guest-token");

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
        TripInvitation invitation = TripInvitation.create(
                10L, "invite-code", 1L, LocalDateTime.now().plusDays(1));
        Trip trip = trip();
        ReflectionTestUtils.setField(trip, "id", 10L);
        when(invitationRepository.findByInviteCode("invite-code"))
                .thenReturn(Optional.of(invitation));
        when(tripRepository.findByIdAndStatusNot(10L, TripStatus.CANCELLED))
                .thenReturn(Optional.of(trip));
        when(tripMemberRepository.existsByTripIdAndMemberId(10L, 2L))
                .thenReturn(false);

        service.claimInvitation(2L, "invite-code", null);

        ArgumentCaptor<TripMember> memberCaptor =
                ArgumentCaptor.forClass(TripMember.class);
        verify(tripMemberRepository).save(memberCaptor.capture());
        assertThat(memberCaptor.getValue().getTripId()).isEqualTo(10L);
        assertThat(memberCaptor.getValue().getMemberId()).isEqualTo(2L);
        assertThat(memberCaptor.getValue().getRole().name()).isEqualTo("VIEWER");
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
