package back.backend.domain.place.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record AddMapPinCommentRequest(
        @NotBlank
        @Size(max = 500)
        String content,

        @NotNull
        Double lat,

        @NotNull
        Double lng,

        @NotBlank
        @Size(max = 255)
        String placeName
) {}
