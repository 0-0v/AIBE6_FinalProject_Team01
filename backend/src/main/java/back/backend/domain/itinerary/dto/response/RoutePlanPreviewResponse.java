package back.backend.domain.itinerary.dto.response;

import java.util.List;

public record RoutePlanPreviewResponse(
        String summary,
        int totalPlaceCount,
        int totalDistanceMeters,
        List<RoutePlanDayResponse> days
) {
}
