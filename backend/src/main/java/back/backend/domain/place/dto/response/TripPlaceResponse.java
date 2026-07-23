package back.backend.domain.place.dto.response;

import back.backend.domain.place.entity.TripPlace;
import back.backend.domain.place.entity.TripPlaceStatus;
import java.math.BigDecimal;

public record TripPlaceResponse(
        Long tripPlaceId,
        String googlePlaceId,
        String name,
        String address,
        BigDecimal latitude,
        BigDecimal longitude,
        String placeType,
        String imageUrl,
        TripPlaceStatus status,
        Long addedBy
) {
    public static TripPlaceResponse from(TripPlace tripPlace) {
        return new TripPlaceResponse(
                tripPlace.getId(),
                tripPlace.getPlace().getGooglePlaceId(),
                tripPlace.getPlace().getName(),
                tripPlace.getPlace().getAddress(),
                tripPlace.getPlace().getLatitude(),
                tripPlace.getPlace().getLongitude(),
                tripPlace.getPlace().getPlaceType(),
                tripPlace.getPlace().getImageUrl(),
                tripPlace.getStatus(),
                tripPlace.getAddedBy()
        );
    }
}
