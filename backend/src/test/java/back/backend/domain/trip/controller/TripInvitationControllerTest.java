package back.backend.domain.trip.controller;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import back.backend.domain.trip.dto.GuestAccessGrant;
import back.backend.domain.trip.dto.TripResponse;
import back.backend.domain.trip.entity.CompanionType;
import back.backend.domain.trip.entity.TravelStyle;
import back.backend.domain.trip.entity.TripStatus;
import back.backend.domain.trip.entity.TripVisibility;
import back.backend.domain.trip.service.GuestAccessCookieProvider;
import back.backend.domain.trip.service.GuestTripAccessService;
import back.backend.domain.trip.service.TripInvitationService;
import back.backend.global.security.SecurityConfig;
import back.backend.global.security.SecurityContextAccessor;
import back.backend.global.security.MemberPrincipal;
import back.backend.global.security.jwt.JwtAuthenticationFilter;
import java.time.LocalDateTime;
import java.util.Set;
import java.util.Optional;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.http.ResponseCookie;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

@WebMvcTest(controllers = TripInvitationController.class, excludeFilters = @ComponentScan.Filter(
        type = FilterType.ASSIGNABLE_TYPE, classes = {SecurityConfig.class, JwtAuthenticationFilter.class}))
@AutoConfigureMockMvc(addFilters = false)
class TripInvitationControllerTest {

    @Autowired MockMvc mockMvc;
    @MockitoBean TripInvitationService invitationService;
    @MockitoBean GuestTripAccessService guestTripAccessService;
    @MockitoBean GuestAccessCookieProvider guestAccessCookieProvider;
    @MockitoBean SecurityContextAccessor securityContextAccessor;

    @Test
    @DisplayName("t1 초대 코드를 수락하면 게스트 쿠키와 여행방 정보를 반환한다")
    void t1_acceptInvitationReturnsGuestCookieAndTrip() throws Exception {
        when(guestTripAccessService.accept("invite-code", null)).thenReturn(
                new GuestAccessGrant(response(), "guest-token", LocalDateTime.now().plusDays(1)));
        when(guestAccessCookieProvider.create("guest-token")).thenReturn(
                ResponseCookie.from(GuestAccessCookieProvider.COOKIE_NAME, "guest-token")
                        .httpOnly(true)
                        .build());

        mockMvc.perform(post("/api/trip-invitations/{inviteCode}/accept", "invite-code"))
                .andExpect(status().isCreated())
                .andExpect(cookie().httpOnly(GuestAccessCookieProvider.COOKIE_NAME, true))
                .andExpect(jsonPath("$.data.id").value(10));
    }

    @Test
    @DisplayName("t2 게스트 쿠키로 허용된 여행방을 조회하면 여행방 정보를 반환한다")
    void t2_getAsGuestReturnsAuthorizedTrip() throws Exception {
        when(guestTripAccessService.getTrip(10L, "guest-token")).thenReturn(response());

        mockMvc.perform(get("/api/guest/trips/{tripId}", 10L)
                        .cookie(new jakarta.servlet.http.Cookie(
                                GuestAccessCookieProvider.COOKIE_NAME, "guest-token")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("제주 여행"));
    }

    @Test
    @DisplayName("t3 로그인 회원이 게스트 권한을 이전하면 게스트 쿠키를 만료한다")
    void t3_claimGuestAccessExpiresGuestCookie() throws Exception {
        when(securityContextAccessor.getCurrentMemberId()).thenReturn(1L);
        when(guestAccessCookieProvider.expire()).thenReturn(
                ResponseCookie.from(GuestAccessCookieProvider.COOKIE_NAME, "").maxAge(0).build());

        mockMvc.perform(post("/api/trip-invitations/claim")
                        .cookie(new jakarta.servlet.http.Cookie(
                                GuestAccessCookieProvider.COOKIE_NAME, "guest-token")))
                .andExpect(status().isOk())
                .andExpect(cookie().maxAge(GuestAccessCookieProvider.COOKIE_NAME, 0));

        verify(guestTripAccessService).claimIfPresent(1L, "guest-token");
    }

    @Test
    @DisplayName("t4 로그인 회원이 초대를 수락해도 참여 확인 전에는 게스트 권한을 유지한다")
    void t4_acceptInvitationAsMemberKeepsGuestAccessUntilConfirmation() throws Exception {
        when(guestTripAccessService.accept("invite-code", null)).thenReturn(
                new GuestAccessGrant(response(), "guest-token", LocalDateTime.now().plusDays(1)));
        when(guestAccessCookieProvider.create("guest-token")).thenReturn(
                ResponseCookie.from(GuestAccessCookieProvider.COOKIE_NAME, "guest-token").build());

        mockMvc.perform(post("/api/trip-invitations/{inviteCode}/accept", "invite-code"))
                .andExpect(status().isCreated())
                .andExpect(cookie().value(GuestAccessCookieProvider.COOKIE_NAME, "guest-token"));
    }

    private TripResponse response() {
        return new TripResponse(10L, 1L, "제주 여행", CompanionType.FRIENDS,
                Set.of(TravelStyle.FOOD), null, null, null, null, 1L, TripStatus.PLANNING,
                TripVisibility.PRIVATE, false, null, null);
    }
}
