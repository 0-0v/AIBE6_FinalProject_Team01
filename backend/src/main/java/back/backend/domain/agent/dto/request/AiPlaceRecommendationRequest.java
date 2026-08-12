package back.backend.domain.agent.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.AssertTrue;

public record AiPlaceRecommendationRequest(
        @NotNull Long dayId,
        Long fromTripPlaceId,
        Long toTripPlaceId,
        @NotBlank @Size(max = 30) String category,
        @Size(max = 500) String prompt,
        @Min(1) @Max(5) Integer limit
) {
    @AssertTrue(message = "추천 기준 장소가 필요합니다.")
    public boolean isRouteBoundaryValid() {
        return fromTripPlaceId != null || toTripPlaceId != null;
    }

    public int resolvedLimit() {
        return limit == null ? 5 : limit;
    }
}
