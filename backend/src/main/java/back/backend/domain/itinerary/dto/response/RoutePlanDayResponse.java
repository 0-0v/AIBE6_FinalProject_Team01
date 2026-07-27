package back.backend.domain.itinerary.dto.response;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.List;

public record RoutePlanDayResponse(
        @NotNull Long dayId,
        int dayNumber,
        LocalDate itineraryDate,
        int totalDistanceMeters,
        @NotNull List<@NotNull @Valid RoutePlanItemResponse> items
) {
}
