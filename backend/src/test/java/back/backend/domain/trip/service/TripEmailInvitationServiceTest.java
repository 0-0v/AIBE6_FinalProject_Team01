package back.backend.domain.trip.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import back.backend.domain.auth.service.SmtpEmailClient;
import back.backend.domain.member.entity.AuthProvider;
import back.backend.domain.member.entity.Member;
import back.backend.domain.member.repository.MemberRepository;
import back.backend.domain.trip.entity.Trip;
import back.backend.domain.trip.entity.TripMember;
import back.backend.domain.trip.entity.TripStatus;
import back.backend.domain.trip.exception.TripErrorCode;
import back.backend.domain.trip.repository.TripMemberRepository;
import back.backend.domain.trip.repository.TripRepository;
import back.backend.global.config.FrontendProperties;
import back.backend.global.exception.BusinessException;
import back.backend.global.redis.RedisValueService;
import back.backend.global.realtime.RealtimeEvent;
import java.time.Duration;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class TripEmailInvitationServiceTest {
    @Mock TripRepository tripRepository;
    @Mock TripMemberRepository tripMemberRepository;
    @Mock MemberRepository memberRepository;
    @Mock RedisValueService redisValueService;
    @Mock SmtpEmailClient emailClient;
    @Mock ApplicationEventPublisher eventPublisher;
    private TripEmailInvitationService service;

    @BeforeEach
    void setUp() {
        FrontendProperties properties = new FrontendProperties();
        properties.setFrontendBaseUrl("https://plamingo.example");
        service = new TripEmailInvitationService(
                tripRepository, tripMemberRepository, memberRepository, redisValueService,
                emailClient, properties, eventPublisher);
    }

    @Test
    @DisplayName("t1 여행방 멤버가 등록 회원 이메일을 초대하면 일회용 링크를 저장하고 메일을 발송한다")
    void t1_sendStoresTokenAndSendsInvitationEmail() {
        Trip trip = trip();
        Member inviter = member(1L, "owner@example.com", "방장");
        Member invitee = member(2L, "friend@example.com", "친구");
        when(tripRepository.findByIdAndMemberIdAndStatusNot(10L, 1L, TripStatus.CANCELLED))
                .thenReturn(Optional.of(trip));
        when(memberRepository.findById(1L)).thenReturn(Optional.of(inviter));
        when(memberRepository.findByEmail("friend@example.com")).thenReturn(Optional.of(invitee));

        service.sendAll(1L, 10L, java.util.List.of("FRIEND@example.com"));

        ArgumentCaptor<String> value = ArgumentCaptor.forClass(String.class);
        verify(redisValueService).set(anyString(), value.capture(), eq(Duration.ofDays(7)));
        assertThat(value.getValue()).isEqualTo("2:10");
        verify(emailClient).sendTripInvitationEmail(
                eq("friend@example.com"), eq("친구"), eq("방장"), eq("제주 여행"),
                org.mockito.ArgumentMatchers.contains("/trip-invite/"), eq(7L));
    }

    @Test
    @DisplayName("t2 이미 참여한 이메일을 초대하면 중복 참여 예외를 반환한다")
    void t2_sendRejectsExistingTripMember() {
        when(tripRepository.findByIdAndMemberIdAndStatusNot(10L, 1L, TripStatus.CANCELLED))
                .thenReturn(Optional.of(trip()));
        when(memberRepository.findById(1L)).thenReturn(Optional.of(member(1L, "owner@example.com", "방장")));
        when(memberRepository.findByEmail("friend@example.com"))
                .thenReturn(Optional.of(member(2L, "friend@example.com", "친구")));
        when(tripMemberRepository.existsByTripIdAndMemberId(10L, 2L)).thenReturn(true);

        assertThatThrownBy(() -> service.sendAll(1L, 10L, java.util.List.of("friend@example.com")))
                .isInstanceOfSatisfying(BusinessException.class,
                        exception -> assertThat(exception.getErrorCode())
                                .isEqualTo(TripErrorCode.INVITEE_ALREADY_MEMBER));
        verify(emailClient, never()).sendTripInvitationEmail(
                anyString(), anyString(), anyString(), anyString(), anyString(), any(Long.class));
    }

    @Test
    @DisplayName("t3 가입되지 않은 이메일을 검증하면 목록에 추가할 수 없다고 반환한다")
    void t3_validateReturnsUnavailableForUnregisteredEmail() {
        when(tripRepository.findByIdAndMemberIdAndStatusNot(10L, 1L, TripStatus.CANCELLED))
                .thenReturn(Optional.of(trip()));
        when(memberRepository.findByEmail("unknown@example.com")).thenReturn(Optional.empty());

        var result = service.validate(1L, 10L, "unknown@example.com");

        assertThat(result.available()).isFalse();
        assertThat(result.message()).contains("가입된 계정");
    }

    @Test
    @DisplayName("t4 로그인 계정과 초대 대상이 일치하면 멤버를 추가한다")
    void t4_acceptAddsInvitedMember() {
        when(redisValueService.get(anyString())).thenReturn(Optional.of("2:10"));
        when(redisValueService.getAndDelete(anyString())).thenReturn(Optional.of("2:10"));
        when(memberRepository.findById(2L)).thenReturn(Optional.of(member(2L, "friend@example.com", "친구")));
        when(tripRepository.findByIdAndStatusNot(10L, TripStatus.CANCELLED)).thenReturn(Optional.of(trip()));

        Long tripId = service.accept(2L, "magic-token");

        assertThat(tripId).isEqualTo(10L);
        verify(tripMemberRepository).save(any(TripMember.class));
        verify(eventPublisher).publishEvent(any(RealtimeEvent.class));
    }

    @Test
    @DisplayName("t5 다른 계정으로 로그인하면 링크를 소진하지 않고 참여를 거절한다")
    void t5_acceptRejectsDifferentAccountWithoutConsumingToken() {
        when(redisValueService.get(anyString())).thenReturn(Optional.of("2:10"));

        assertThatThrownBy(() -> service.accept(3L, "magic-token"))
                .isInstanceOfSatisfying(BusinessException.class,
                        exception -> assertThat(exception.getErrorCode())
                                .isEqualTo(TripErrorCode.EMAIL_INVITATION_ACCOUNT_MISMATCH));
        verify(redisValueService, never()).getAndDelete(anyString());
    }

    @Test
    @DisplayName("t6 사용했거나 만료된 이메일 초대 토큰은 참여를 거절한다")
    void t6_acceptRejectsMissingToken() {
        when(redisValueService.get(anyString())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.accept(2L, "expired-token"))
                .isInstanceOfSatisfying(BusinessException.class,
                        exception -> assertThat(exception.getErrorCode())
                                .isEqualTo(TripErrorCode.EMAIL_INVITATION_INVALID));
    }

    private Trip trip() {
        Trip trip = Trip.create(1L, "제주 여행", null, Set.of(), null, null, null);
        ReflectionTestUtils.setField(trip, "id", 10L);
        return trip;
    }

    private Member member(Long id, String email, String nickname) {
        Member member = Member.create(email, nickname, null, AuthProvider.KAKAO, "provider-" + id);
        ReflectionTestUtils.setField(member, "id", id);
        return member;
    }
}
