package back.backend.domain.travelrecord.dto;

import java.time.LocalDateTime;
import java.util.List;

public record TravelRecordResponse(
        Long id,
        Long memberId,
        String memberNickname,
        Long tripPlaceId,
        Long itineraryItemId,
        int dayNumber,
        LocalDateTime visitedAt,
        String memo,
        List<String> imageUrls,
        LocalDateTime createdAt
) {
}
