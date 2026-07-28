package back.backend.domain.itinerary.dto.request;

import back.backend.domain.itinerary.entity.ItineraryTransportMode;
import jakarta.validation.constraints.NotNull;

public record UpdateItineraryTransportModeRequest(
        @NotNull ItineraryTransportMode transportMode
) {
}
