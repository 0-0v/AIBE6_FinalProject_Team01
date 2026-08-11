package back.backend.domain.auth.exception;

import back.backend.domain.member.entity.Member;
import back.backend.global.exception.BusinessException;
import java.time.LocalDateTime;

public class SuspendedAccountException extends BusinessException {
    private final String reason;
    private final LocalDateTime suspendedAt;
    private final LocalDateTime suspendedUntil;

    public SuspendedAccountException(Member member) {
        super(AuthErrorCode.SUSPENDED_ACCOUNT);
        this.reason = member.getSuspensionReason();
        this.suspendedAt = member.getSuspendedAt();
        this.suspendedUntil = member.getSuspendedUntil();
    }

    public String getReason() {
        return reason;
    }

    public LocalDateTime getSuspendedAt() {
        return suspendedAt;
    }

    public LocalDateTime getSuspendedUntil() {
        return suspendedUntil;
    }
}
