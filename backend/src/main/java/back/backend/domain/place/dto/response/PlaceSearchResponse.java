package back.backend.domain.place.dto.response;

import java.util.List;

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
        List<String> weekdayDescriptions,
        String phoneNumber,
        String websiteUri,
        String editorialSummary,
        String topReviewText,
        Integer topReviewRating,
        String topReviewAuthor,
        String topReviewTime
) {}
