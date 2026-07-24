package back.backend.domain.place.dto.request;

import jakarta.validation.constraints.NotNull;

public record UpdateTripPlaceCategoryRequest(
        @NotNull Long categoryId
) {
}
