package back.backend.domain.agent.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AiItineraryReplanRequest(
        @NotBlank @Size(max = 500) String reason
) {
}
