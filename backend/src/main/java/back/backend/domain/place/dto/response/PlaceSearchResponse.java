package back.backend.domain.place.dto.response;

public record PlaceSearchResponse(
        String googlePlaceId,
        String name,
        String address,
        double latitude,
        double longitude,
        String placeType,
        String imageUrl,
        Double rating,
        Integer userRatingCount,
        Boolean openNow,
        String phoneNumber,
        String websiteUri
) {}