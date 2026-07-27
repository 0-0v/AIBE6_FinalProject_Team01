package back.backend.domain.itinerary.dto.response;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

public record RoutePlanItemResponse(
        @NotNull Long tripPlaceId,
        String placeName,
        String categoryName,
        String categoryColor,
        String startTime,
        String endTime,
        @PositiveOrZero Integer transportMinutes,
        @PositiveOrZero Integer transportMeters,
        String transportMode,
        String reason
) {
}
