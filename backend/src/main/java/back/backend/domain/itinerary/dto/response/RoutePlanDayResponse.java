package back.backend.domain.itinerary.dto.response;

import java.time.LocalDate;
import java.util.List;

public record RoutePlanDayResponse(
        Long dayId,
        int dayNumber,
        LocalDate itineraryDate,
        int totalDistanceMeters,
        List<RoutePlanItemResponse> items
) {
}
