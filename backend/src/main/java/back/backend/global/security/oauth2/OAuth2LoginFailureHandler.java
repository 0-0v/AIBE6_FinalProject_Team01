package back.backend.global.security.oauth2;

import back.backend.global.config.FrontendProperties;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

@Component
public class OAuth2LoginFailureHandler implements AuthenticationFailureHandler {

    private static final String LOGIN_PATH = "/login";

    private final FrontendProperties frontendProperties;

    public OAuth2LoginFailureHandler(FrontendProperties frontendProperties) {
        this.frontendProperties = frontendProperties;
    }

    @Override
    public void onAuthenticationFailure(
            HttpServletRequest request,
            HttpServletResponse response,
            AuthenticationException exception
    ) throws IOException {
        String error = "oauth2_login_failed";
        if (exception instanceof OAuth2AuthenticationException oauth2Exception) {
            String errorCode = oauth2Exception.getError().getErrorCode();
            if ("email_already_registered".equals(errorCode)
                    || "withdrawn_account_retained".equals(errorCode)) {
                error = errorCode;
            }
        }
        String redirectUrl = UriComponentsBuilder.fromUriString(frontendProperties.getFrontendBaseUrl())
                .path(LOGIN_PATH)
                .queryParam("error", error)
                .build()
                .toUriString();

        response.sendRedirect(redirectUrl);
    }
}
