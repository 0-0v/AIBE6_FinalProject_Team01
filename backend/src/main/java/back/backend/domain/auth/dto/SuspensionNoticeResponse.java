package back.backend.domain.auth.dto;

import java.time.LocalDateTime;

public record SuspensionNoticeResponse(
        String suspensionReason,
        LocalDateTime suspendedAt,
        LocalDateTime suspendedUntil
) {
}
