package back.backend.domain.agent.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record AiPlaceRecommendationRequest(
        @NotNull Long dayId,
        @NotBlank @Size(max = 30) String category,
        @Size(max = 500) String prompt,
        @Min(1) @Max(5) Integer limit
) {
    public int resolvedLimit() {
        return limit == null ? 5 : limit;
    }
}
