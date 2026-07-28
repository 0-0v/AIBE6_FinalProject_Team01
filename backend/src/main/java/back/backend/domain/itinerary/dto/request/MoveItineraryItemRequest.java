package back.backend.domain.itinerary.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

public record MoveItineraryItemRequest(
    @NotNull Long targetDayId,
    @PositiveOrZero int sortOrder
) {}
