package back.backend.domain.itinerary.dto.request;

import jakarta.validation.constraints.NotBlank;

public record UpdateDeparturePlaceRequest(
        /** TRIP_PLACE | CUSTOM | NONE */
        @NotBlank String type,

        /** type=TRIP_PLACE 일 때 사용 */
        Long tripPlaceId,

        /** type=CUSTOM 일 때 사용 */
        String name,
        Double latitude,
        Double longitude
) {}
