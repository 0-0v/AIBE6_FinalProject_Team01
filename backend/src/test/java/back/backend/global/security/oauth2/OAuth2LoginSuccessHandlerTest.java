package back.backend.global.security.oauth2;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import back.backend.global.config.FrontendProperties;
import back.backend.domain.trip.service.GuestAccessCookieProvider;
import back.backend.domain.trip.service.GuestTripAccessService;
import back.backend.global.security.MemberPrincipal;
import back.backend.global.security.jwt.JwtProvider;
import back.backend.global.security.jwt.RefreshTokenCookieProvider;
import back.backend.global.security.jwt.RefreshTokenRepository;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseCookie;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import jakarta.servlet.http.Cookie;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.web.util.UriComponentsBuilder;

@ExtendWith(MockitoExtension.class)
class OAuth2LoginSuccessHandlerTest {

    @Mock
    private JwtProvider jwtProvider;

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    @Mock
    private RefreshTokenCookieProvider refreshTokenCookieProvider;

    @Mock
    private GuestTripAccessService guestTripAccessService;

    @Mock
    private GuestAccessCookieProvider guestAccessCookieProvider;

    private OAuth2LoginSuccessHandler handler;

    @BeforeEach
    void setUp() {
        FrontendProperties frontendProperties = new FrontendProperties();
        frontendProperties.setFrontendBaseUrl("https://plamingo.example");
        handler = new OAuth2LoginSuccessHandler(
                jwtProvider, refreshTokenRepository, refreshTokenCookieProvider, frontendProperties,
                guestTripAccessService, guestAccessCookieProvider);
    }

    @Test
    @DisplayName("t1 로그인에 성공하면 액세스 토큰을 담아 프론트 콜백 URL로 리다이렉트하고 리프레시 토큰은 쿠키로 내려준다")
    void t1_onAuthenticationSuccessRedirectsWithAccessTokenAndSetsRefreshTokenCookie() throws Exception {
        MemberPrincipal principal = new MemberPrincipal(1L, "user@example.com", List.of(new SimpleGrantedAuthority("ROLE_USER")));
        Authentication authentication = new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
        when(jwtProvider.createAccessToken(1L, "user@example.com")).thenReturn("access-token");
        when(jwtProvider.createRefreshToken(1L)).thenReturn("refresh-token");
        ResponseCookie cookie = ResponseCookie.from("refreshToken", "refresh-token").build();
        when(refreshTokenCookieProvider.create("refresh-token")).thenReturn(cookie);

        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();

        handler.onAuthenticationSuccess(request, response, authentication);

        verify(refreshTokenRepository).save(1L, "refresh-token");
        assertThat(response.getHeader("Set-Cookie")).isEqualTo(cookie.toString());
        assertThat(response.getStatus()).isEqualTo(302);
        String redirectedUrl = response.getRedirectedUrl();
        assertThat(redirectedUrl).startsWith("https://plamingo.example/oauth/callback");
        var params = UriComponentsBuilder.fromUriString(redirectedUrl).build().getQueryParams();
        assertThat(params.getFirst("accessToken")).isEqualTo("access-token");
        assertThat(params.containsKey("refreshToken")).isFalse();
    }

    @Test
    @DisplayName("t2 게스트가 로그인하면 여행방 권한을 회원에게 이전하고 게스트 쿠키를 만료한다")
    void t2_onAuthenticationSuccessClaimsGuestAccessAndExpiresGuestCookie() throws Exception {
        MemberPrincipal principal = new MemberPrincipal(
                1L, "user@example.com", List.of(new SimpleGrantedAuthority("ROLE_USER")));
        Authentication authentication = new UsernamePasswordAuthenticationToken(
                principal, null, principal.getAuthorities());
        when(jwtProvider.createAccessToken(1L, "user@example.com")).thenReturn("access-token");
        when(jwtProvider.createRefreshToken(1L)).thenReturn("refresh-token");
        when(refreshTokenCookieProvider.create("refresh-token"))
                .thenReturn(ResponseCookie.from("refreshToken", "refresh-token").build());
        when(guestTripAccessService.claimIfPresent(1L, "guest-token")).thenReturn(true);
        ResponseCookie expiredCookie = ResponseCookie.from("guestAccessToken", "")
                .maxAge(0)
                .build();
        when(guestAccessCookieProvider.expire()).thenReturn(expiredCookie);
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setCookies(new Cookie("guestAccessToken", "guest-token"));
        MockHttpServletResponse response = new MockHttpServletResponse();

        handler.onAuthenticationSuccess(request, response, authentication);

        verify(guestTripAccessService).claimIfPresent(1L, "guest-token");
        assertThat(response.getHeaders("Set-Cookie"))
                .anyMatch(value -> value.startsWith("guestAccessToken=; Max-Age=0"));
    }
}
