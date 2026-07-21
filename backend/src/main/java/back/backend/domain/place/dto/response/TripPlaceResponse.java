package back.backend.domain.place.dto.response;

import back.backend.domain.place.entity.TripPlace;
import back.backend.domain.place.entity.TripPlaceStatus;

public record TripPlaceResponse(
        Long tripPlaceId,
        String googlePlaceId,
        String name,
        String address,
        Double latitude,
        Double longitude,
        String placeType,
        String imageUrl,
        TripPlaceStatus status,
        String userNote,
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
                tripPlace.getUserNote(),
                tripPlace.getAddedBy()
        );
    }
}
