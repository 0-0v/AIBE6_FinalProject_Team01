package back.backend.global.security.oauth2;

import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;

public class SuspendedOAuth2AuthenticationException extends OAuth2AuthenticationException {

    private final String noticeToken;

    public SuspendedOAuth2AuthenticationException(String noticeToken) {
        super(new OAuth2Error("suspended_account"), "Suspended account");
        this.noticeToken = noticeToken;
    }

    public String getNoticeToken() {
        return noticeToken;
    }
}
