package back.backend.domain.place.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpdatePlaceCategoryRequest(
        @NotBlank @Size(max = 50) String name,
        @NotBlank
        @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "마커 색상은 #RRGGBB 형식이어야 합니다.")
        String markerColor,
        @NotBlank @Size(max = 50) String markerIcon
) {
}
