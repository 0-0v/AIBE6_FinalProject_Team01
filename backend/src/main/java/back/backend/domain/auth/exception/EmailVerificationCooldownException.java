package back.backend.domain.auth.exception;

import back.backend.global.exception.BusinessException;

public class EmailVerificationCooldownException extends BusinessException {
    private final long retryAfterSeconds;

    public EmailVerificationCooldownException(long retryAfterSeconds) {
        super(
                AuthErrorCode.EMAIL_VERIFICATION_RATE_LIMITED,
                "인증번호가 만료되었습니다. 잠시 후 다시 요청해 주세요."
        );
        this.retryAfterSeconds = retryAfterSeconds;
    }

    public long getRetryAfterSeconds() {
        return retryAfterSeconds;
    }
}
