package back.backend.domain.place.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AddPlaceCommentRequest(
        @NotBlank
        @Size(max = 500)
        String content
) {}
