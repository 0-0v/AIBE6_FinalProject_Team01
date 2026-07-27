package back.backend.domain.itinerary.dto.response;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record RoutePlanPreviewResponse(
        String summary,
        int totalPlaceCount,
        int totalDistanceMeters,
        @NotNull List<@NotNull @Valid RoutePlanDayResponse> days
) {
}
