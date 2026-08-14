package back.backend.domain.place.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import back.backend.domain.trip.repository.TripMemberRepository;
import back.backend.domain.trip.repository.TripRepository;
import back.backend.domain.trip.entity.Trip;
import back.backend.domain.trip.entity.TripStatus;
import back.backend.domain.trip.exception.TripErrorCode;
import back.backend.domain.trip.service.GuestAccessCookieProvider;
import back.backend.domain.trip.service.GuestTripAccessService;
import back.backend.global.exception.BusinessException;
import back.backend.global.exception.CommonErrorCode;
import back.backend.global.security.MemberPrincipal;
import back.backend.global.security.SecurityContextAccessor;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

@ExtendWith(MockitoExtension.class)
class TripAccessCheckerTest {

    @Mock TripMemberRepository tripMemberRepository;
    @Mock TripRepository tripRepository;
    @Mock SecurityContextAccessor securityContextAccessor;
    @Mock GuestTripAccessService guestTripAccessService;
    @Mock HttpServletRequest request;

    private TripAccessChecker checker;

    @BeforeEach
    void setUp() {
        checker = new TripAccessChecker(
                tripMemberRepository, tripRepository, securityContextAccessor, guestTripAccessService, request);
    }

    @Test
    @DisplayName("t1 여행방 회원은 회원 식별자로 조회 권한을 확인한다")
    void t1_requireViewReturnsMemberIdForAuthorizedMember() {
        MemberPrincipal principal = new MemberPrincipal(
                1L, "user@example.com", List.of(new SimpleGrantedAuthority("ROLE_USER")));
        when(securityContextAccessor.getCurrentPrincipal()).thenReturn(Optional.of(principal));
        when(tripMemberRepository.existsByTripIdAndMemberId(10L, 1L)).thenReturn(true);

        assertThat(checker.requireView(10L)).isEqualTo(1L);
    }

    @Test
    @DisplayName("t2 유효한 게스트 쿠키는 회원 식별자 없이 조회 권한을 허용한다")
    void t2_requireViewAllowsAuthorizedGuest() {
        when(securityContextAccessor.getCurrentPrincipal()).thenReturn(Optional.empty());
        when(request.getCookies()).thenReturn(
                new Cookie[]{new Cookie(GuestAccessCookieProvider.COOKIE_NAME, "guest-token")});
        when(guestTripAccessService.canView(10L, "guest-token")).thenReturn(true);

        assertThat(checker.requireView(10L)).isNull();
    }

    @Test
    @DisplayName("t3 회원 인증과 게스트 쿠키가 모두 없으면 인증 필요 예외를 반환한다")
    void t3_requireViewRejectsRequestWithoutCredentials() {
        when(securityContextAccessor.getCurrentPrincipal()).thenReturn(Optional.empty());

        assertThatThrownBy(() -> checker.requireView(10L))
                .isInstanceOfSatisfying(BusinessException.class,
                        exception -> assertThat(exception.getErrorCode())
                                .isEqualTo(CommonErrorCode.UNAUTHORIZED));
    }

    @Test
    @DisplayName("t4 다른 여행방의 게스트 쿠키이면 접근을 거부한다")
    void t4_requireViewRejectsUnauthorizedGuest() {
        when(securityContextAccessor.getCurrentPrincipal()).thenReturn(Optional.empty());
        when(request.getCookies()).thenReturn(
                new Cookie[]{new Cookie(GuestAccessCookieProvider.COOKIE_NAME, "guest-token")});
        when(guestTripAccessService.canView(10L, "guest-token")).thenReturn(false);

        assertThatThrownBy(() -> checker.requireView(10L))
                .isInstanceOfSatisfying(BusinessException.class,
                        exception -> assertThat(exception.getErrorCode())
                                .isEqualTo(CommonErrorCode.FORBIDDEN));
    }

    @Test
    @DisplayName("t5 여행방 회원이 아닌 로그인 사용자도 유효한 게스트 쿠키가 있으면 조회할 수 있다")
    void t5_requireViewFallsBackToGuestAccessForAuthenticatedNonMember() {
        MemberPrincipal principal = new MemberPrincipal(
                1L, "user@example.com", List.of(new SimpleGrantedAuthority("ROLE_USER")));
        when(securityContextAccessor.getCurrentPrincipal()).thenReturn(Optional.of(principal));
        when(tripMemberRepository.existsByTripIdAndMemberId(10L, 1L)).thenReturn(false);
        when(request.getCookies()).thenReturn(
                new Cookie[]{new Cookie(GuestAccessCookieProvider.COOKIE_NAME, "guest-token")});
        when(guestTripAccessService.canView(10L, "guest-token")).thenReturn(true);

        assertThat(checker.requireView(10L)).isNull();
    }

    @Test
    @DisplayName("t6 완료된 여행방은 계획 기능을 수정할 수 없다")
    void t6_requireEditRejectsCompletedTrip() {
        Trip trip = org.mockito.Mockito.mock(Trip.class);
        when(securityContextAccessor.getCurrentMemberId()).thenReturn(1L);
        when(tripMemberRepository.existsByTripIdAndMemberId(10L, 1L)).thenReturn(true);
        when(tripRepository.findById(10L)).thenReturn(Optional.of(trip));
        when(trip.getStatus()).thenReturn(TripStatus.COMPLETED);

        assertThatThrownBy(() -> checker.requireEdit(10L))
                .isInstanceOfSatisfying(BusinessException.class,
                        exception -> assertThat(exception.getErrorCode())
                                .isEqualTo(TripErrorCode.TRIP_ALREADY_FINISHED));
    }

    @Test
    @DisplayName("t7 진행 중인 여행방 멤버는 계획 기능을 수정할 수 있다")
    void t7_requireEditAllowsActiveTripMember() {
        Trip trip = org.mockito.Mockito.mock(Trip.class);
        when(securityContextAccessor.getCurrentMemberId()).thenReturn(1L);
        when(tripMemberRepository.existsByTripIdAndMemberId(10L, 1L)).thenReturn(true);
        when(tripRepository.findById(10L)).thenReturn(Optional.of(trip));
        when(trip.getStatus()).thenReturn(TripStatus.IN_PROGRESS);

        assertThat(checker.requireEdit(10L)).isEqualTo(1L);
    }

    @Test
    @DisplayName("t8 완료된 여행방 멤버도 기록 기능은 수정할 수 있다")
    void t8_requireRecordEditAllowsCompletedTripMember() {
        when(securityContextAccessor.getCurrentMemberId()).thenReturn(1L);
        when(tripMemberRepository.existsByTripIdAndMemberId(10L, 1L)).thenReturn(true);

        assertThat(checker.requireRecordEdit(10L)).isEqualTo(1L);
    }
}
