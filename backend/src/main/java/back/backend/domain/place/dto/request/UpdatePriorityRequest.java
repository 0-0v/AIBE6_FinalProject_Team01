package back.backend.domain.place.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record UpdatePriorityRequest(
        @NotNull @Positive Integer priority
) {}
