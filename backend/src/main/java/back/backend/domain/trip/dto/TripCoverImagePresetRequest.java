package back.backend.domain.trip.dto;

import jakarta.validation.constraints.NotBlank;

public record TripCoverImagePresetRequest(
        @NotBlank(message = "기본 이미지를 선택해 주세요.")
        String presetKey
) {
}
