package back.backend.domain.trip.dto;

import back.backend.domain.trip.entity.TripVisibility;
import jakarta.validation.constraints.NotNull;

public record TripVisibilityRequest(
        @NotNull(message = "여행방 공개 여부는 필수입니다.")
        TripVisibility visibility
) {
}
