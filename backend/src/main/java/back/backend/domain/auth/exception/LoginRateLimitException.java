package back.backend.domain.auth.exception;

import back.backend.global.exception.BusinessException;

public class LoginRateLimitException extends BusinessException {
    private final long retryAfterSeconds;

    public LoginRateLimitException(long retryAfterSeconds) {
        super(AuthErrorCode.LOGIN_RATE_LIMITED);
        this.retryAfterSeconds = Math.max(retryAfterSeconds, 1L);
    }

    public long getRetryAfterSeconds() {
        return retryAfterSeconds;
    }
}
