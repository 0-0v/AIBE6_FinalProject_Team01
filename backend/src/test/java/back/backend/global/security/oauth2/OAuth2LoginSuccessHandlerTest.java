package back.backend.global.security.oauth2;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import back.backend.global.config.FrontendProperties;
import back.backend.global.security.MemberPrincipal;
import back.backend.global.security.jwt.JwtProvider;
import back.backend.global.security.jwt.RefreshTokenRepository;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
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

    private OAuth2LoginSuccessHandler handler;

    @BeforeEach
    void setUp() {
        FrontendProperties frontendProperties = new FrontendProperties();
        frontendProperties.setFrontendBaseUrl("https://plamingo.example");
        handler = new OAuth2LoginSuccessHandler(jwtProvider, refreshTokenRepository, frontendProperties);
    }

    @Test
    @DisplayName("t1 로그인에 성공하면 토큰을 발급해 프론트 콜백 URL로 리다이렉트한다")
    void t1_onAuthenticationSuccessRedirectsWithTokens() throws Exception {
        MemberPrincipal principal = new MemberPrincipal(1L, "user@example.com", List.of(new SimpleGrantedAuthority("ROLE_USER")));
        Authentication authentication = new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
        when(jwtProvider.createAccessToken(1L, "user@example.com")).thenReturn("access-token");
        when(jwtProvider.createRefreshToken(1L)).thenReturn("refresh-token");

        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();

        handler.onAuthenticationSuccess(request, response, authentication);

        verify(refreshTokenRepository).save(1L, "refresh-token");
        assertThat(response.getStatus()).isEqualTo(302);
        String redirectedUrl = response.getRedirectedUrl();
        assertThat(redirectedUrl).startsWith("https://plamingo.example/oauth/callback");
        var params = UriComponentsBuilder.fromUriString(redirectedUrl).build().getQueryParams();
        assertThat(params.getFirst("accessToken")).isEqualTo("access-token");
        assertThat(params.getFirst("refreshToken")).isEqualTo("refresh-token");
    }
}
