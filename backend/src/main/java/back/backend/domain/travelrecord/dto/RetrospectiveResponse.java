package back.backend.domain.travelrecord.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record RetrospectiveResponse(
        Long id,
        Long memberId,
        BigDecimal rating,
        String goodPoints,
        String improvements,
        String summary,
        LocalDateTime updatedAt
) {
}
