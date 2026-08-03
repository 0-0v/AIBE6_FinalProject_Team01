package back.backend.domain.card.dto;

import java.time.LocalDateTime;
import java.util.List;

public record PublicCardRecordResponse(
        Long id,
        Long tripPlaceId,
        String placeName,
        String categoryName,
        String address,
        String memo,
        List<String> imageUrls,
        String recordedByNickname,
        LocalDateTime visitedAt
) {
}
