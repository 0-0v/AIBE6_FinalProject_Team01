package back.backend.domain.itinerary.dto.request;

import back.backend.domain.itinerary.entity.ItineraryDayStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateItineraryDayStatusRequest(
    @NotNull ItineraryDayStatus status
) {}
