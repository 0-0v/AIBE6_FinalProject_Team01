package back.backend.domain.itinerary.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

public record AddItineraryItemRequest(
    @NotNull Long tripPlaceId,
    @PositiveOrZero int sortOrder
) {}
