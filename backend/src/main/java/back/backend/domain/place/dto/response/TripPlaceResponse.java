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
        String photoName,
        TripPlaceStatus status,
        Long addedBy,
        int commentCount
) {
    public static TripPlaceResponse from(TripPlace tripPlace) {
        return from(tripPlace, 0);
    }

    public static TripPlaceResponse from(TripPlace tripPlace, int commentCount) {
        return new TripPlaceResponse(
                tripPlace.getId(),
                tripPlace.getPlace().getGooglePlaceId(),
                tripPlace.getPlace().getName(),
                tripPlace.getPlace().getAddress(),
                tripPlace.getPlace().getLatitude(),
                tripPlace.getPlace().getLongitude(),
                tripPlace.getPlace().getPlaceType(),
                tripPlace.getPlace().getGooglePhotoName(),
                tripPlace.getStatus(),
                tripPlace.getAddedBy(),
                commentCount
        );
    }
}
