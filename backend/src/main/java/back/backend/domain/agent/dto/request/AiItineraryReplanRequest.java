package back.backend.domain.agent.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record AiItineraryReplanRequest(
        @NotEmpty List<@NotNull Long> itineraryItemIds,
        @NotEmpty List<@NotBlank String> reasons
) {
}
