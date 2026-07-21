package back.backend.global.security.oauth2;

import static org.assertj.core.api.Assertions.assertThat;

import back.backend.global.config.FrontendProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.util.UriComponentsBuilder;

class OAuth2LoginFailureHandlerTest {

    private OAuth2LoginFailureHandler handler;

    @BeforeEach
    void setUp() {
        FrontendProperties frontendProperties = new FrontendProperties();
        frontendProperties.setFrontendBaseUrl("https://plamingo.example");
        handler = new OAuth2LoginFailureHandler(frontendProperties);
    }

    @Test
    @DisplayName("t1 로그인에 실패하면 에러 파라미터와 함께 프론트 로그인 페이지로 리다이렉트한다")
    void t1_onAuthenticationFailureRedirectsWithErrorParam() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();

        handler.onAuthenticationFailure(request, response, new BadCredentialsException("failed"));

        assertThat(response.getStatus()).isEqualTo(302);
        String redirectedUrl = response.getRedirectedUrl();
        assertThat(redirectedUrl).startsWith("https://plamingo.example/login");
        var params = UriComponentsBuilder.fromUriString(redirectedUrl).build().getQueryParams();
        assertThat(params.getFirst("error")).isEqualTo("oauth2_login_failed");
    }
}
