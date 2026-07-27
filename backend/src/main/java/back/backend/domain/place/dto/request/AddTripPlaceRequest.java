package back.backend.domain.place.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record AddTripPlaceRequest(
        @NotBlank String googlePlaceId,
        @NotBlank String name,
        String address,
        @NotNull Double latitude,
        @NotNull Double longitude,
        String placeType,
        String photoName,
        List<String> placeTypes
) {}
