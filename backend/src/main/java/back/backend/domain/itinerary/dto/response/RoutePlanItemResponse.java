package back.backend.domain.itinerary.dto.response;

public record RoutePlanItemResponse(
        Long tripPlaceId,
        String placeName,
        String categoryName,
        String categoryColor,
        String startTime,
        String endTime,
        Integer transportMinutes,
        Integer transportMeters,
        String reason
) {
}
