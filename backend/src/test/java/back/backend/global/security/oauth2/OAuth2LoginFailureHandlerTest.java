package back.backend.global.security.oauth2;

import static org.assertj.core.api.Assertions.assertThat;

import back.backend.global.config.FrontendProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;
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

    @Test
    @DisplayName("t2 다른 로그인 방식에서 사용 중인 이메일이면 전용 에러 파라미터로 리다이렉트한다")
    void t2_existingEmailRedirectsWithSpecificErrorParam() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();
        OAuth2AuthenticationException exception = new OAuth2AuthenticationException(
                new OAuth2Error("email_already_registered"),
                "이미 다른 로그인 방식으로 가입된 이메일입니다."
        );

        handler.onAuthenticationFailure(request, response, exception);

        String redirectedUrl = response.getRedirectedUrl();
        var params = UriComponentsBuilder.fromUriString(redirectedUrl).build().getQueryParams();
        assertThat(params.getFirst("error")).isEqualTo("email_already_registered");
    }

    @Test
    @DisplayName("t3 개인정보 보관기간이 남은 탈퇴 계정이면 전용 에러 파라미터로 리다이렉트한다")
    void t3_withdrawnAccountRedirectsWithSpecificErrorParam() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();
        OAuth2AuthenticationException exception = new OAuth2AuthenticationException(
                new OAuth2Error("withdrawn_account_retained"),
                "탈퇴 계정의 개인정보 보관기간이 아직 지나지 않았습니다."
        );

        handler.onAuthenticationFailure(request, response, exception);

        String redirectedUrl = response.getRedirectedUrl();
        var params = UriComponentsBuilder.fromUriString(redirectedUrl).build().getQueryParams();
        assertThat(params.getFirst("error")).isEqualTo("withdrawn_account_retained");
    }

    @Test
    @DisplayName("t4 정지 계정이면 상세 정보를 조회할 일회성 토큰과 함께 로그인 페이지로 이동한다")
    void t4_suspendedAccountRedirectsWithNoticeToken() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();

        handler.onAuthenticationFailure(
                request,
                response,
                new SuspendedOAuth2AuthenticationException("notice-token"));

        var params = UriComponentsBuilder.fromUriString(response.getRedirectedUrl()).build().getQueryParams();
        assertThat(params.getFirst("error")).isEqualTo("suspended_account");
        assertThat(params.getFirst("suspensionToken")).isEqualTo("notice-token");
    }
}
