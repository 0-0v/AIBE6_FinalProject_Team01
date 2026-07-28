package back.backend.domain.card.dto;

import jakarta.validation.constraints.NotNull;

public record CopyItineraryRequest(
        @NotNull Long targetTripId,
        @NotNull CopyItineraryMode mode
) {
}
