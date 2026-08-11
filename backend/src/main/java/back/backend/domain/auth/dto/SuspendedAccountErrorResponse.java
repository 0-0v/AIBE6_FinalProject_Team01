package back.backend.domain.auth.dto;

import back.backend.domain.auth.exception.AuthErrorCode;
import back.backend.domain.auth.exception.SuspendedAccountException;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;

public record SuspendedAccountErrorResponse(
        OffsetDateTime timestamp,
        int status,
        String code,
        String message,
        String path,
        String suspensionReason,
        LocalDateTime suspendedAt,
        LocalDateTime suspendedUntil
) {
    public static SuspendedAccountErrorResponse from(
            SuspendedAccountException exception,
            String path
    ) {
        AuthErrorCode errorCode = AuthErrorCode.SUSPENDED_ACCOUNT;
        return new SuspendedAccountErrorResponse(
                OffsetDateTime.now(),
                errorCode.getStatus().value(),
                errorCode.getCode(),
                exception.getMessage(),
                path,
                exception.getReason(),
                exception.getSuspendedAt(),
                exception.getSuspendedUntil()
        );
    }
}
