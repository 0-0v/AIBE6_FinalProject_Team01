package back.backend.global.security.oauth2;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import back.backend.domain.auth.service.OAuthLoginCodeService;
import back.backend.domain.member.entity.Member;
import back.backend.domain.member.repository.MemberRepository;
import back.backend.global.config.FrontendProperties;
import back.backend.global.security.MemberPrincipal;
import back.backend.global.security.jwt.JwtProvider;
import back.backend.global.security.jwt.RefreshTokenCookieProvider;
import back.backend.global.security.jwt.RefreshTokenRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseCookie;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.web.util.UriComponentsBuilder;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class OAuth2LoginSuccessHandlerTest {

    @Mock
    private JwtProvider jwtProvider;

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    @Mock
    private RefreshTokenCookieProvider refreshTokenCookieProvider;

    @Mock
    private OAuth2TokenCaptureService oAuth2TokenCaptureService;

    @Mock
    private OAuthLoginCodeService oAuthLoginCodeService;

    @Mock
    private MemberRepository memberRepository;

    private OAuth2LoginSuccessHandler handler;

    @BeforeEach
    void setUp() {
        FrontendProperties frontendProperties = new FrontendProperties();
        frontendProperties.setFrontendBaseUrl("https://plamingo.example");
        handler = new OAuth2LoginSuccessHandler(
                jwtProvider,
                refreshTokenRepository,
                refreshTokenCookieProvider,
                frontendProperties,
                oAuth2TokenCaptureService,
                oAuthLoginCodeService,
                memberRepository);
    }

    @Test
    @DisplayName("t1 로그인에 성공하면 액세스 토큰 대신 1회용 교환 코드를 담아 프론트 콜백 URL로 리다이렉트하고 리프레시 토큰은 쿠키로 내려준다")
    void t1_onAuthenticationSuccessRedirectsWithExchangeCodeAndSetsRefreshTokenCookie() throws Exception {
        MemberPrincipal principal = new MemberPrincipal(1L, "user@example.com", List.of(new SimpleGrantedAuthority("ROLE_USER")));
        Member member = Member.createLocal("user@example.com", "여행자", "hash");
        ReflectionTestUtils.setField(member, "id", 1L);
        Authentication authentication = new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
        when(memberRepository.findById(1L)).thenReturn(Optional.of(member));
        when(jwtProvider.createAccessToken(1L, "user@example.com", 0L)).thenReturn("access-token");
        when(jwtProvider.createRefreshToken(1L, 0L)).thenReturn("refresh-token");
        ResponseCookie cookie = ResponseCookie.from("refreshToken", "refresh-token").build();
        when(refreshTokenCookieProvider.create("refresh-token")).thenReturn(cookie);
        when(oAuthLoginCodeService.issue("access-token")).thenReturn("exchange-code");

        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();

        handler.onAuthenticationSuccess(request, response, authentication);

        verify(refreshTokenRepository).save(1L, "refresh-token");
        verify(oAuth2TokenCaptureService).capture(authentication, 1L);
        assertThat(response.getHeader("Set-Cookie")).isEqualTo(cookie.toString());
        assertThat(response.getStatus()).isEqualTo(302);
        String redirectedUrl = response.getRedirectedUrl();
        assertThat(redirectedUrl).startsWith("https://plamingo.example/oauth/callback");
        var params = UriComponentsBuilder.fromUriString(redirectedUrl).build().getQueryParams();
        assertThat(params.getFirst("code")).isEqualTo("exchange-code");
        assertThat(params.containsKey("accessToken")).isFalse();
        assertThat(params.containsKey("refreshToken")).isFalse();
    }
}
