package back.backend.domain.place.dto.request;

import back.backend.domain.place.entity.TripPlaceStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateStatusRequest(
        @NotNull TripPlaceStatus status
) {}
