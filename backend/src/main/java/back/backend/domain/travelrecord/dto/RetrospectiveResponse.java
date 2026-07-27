package back.backend.domain.travelrecord.dto;

import java.time.LocalDateTime;

public record RetrospectiveResponse(
        Long id,
        Long memberId,
        String goodPoints,
        String improvements,
        String summary,
        LocalDateTime updatedAt
) {
}
