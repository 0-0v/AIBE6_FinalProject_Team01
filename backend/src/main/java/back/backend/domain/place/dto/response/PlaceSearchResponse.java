package back.backend.domain.place.dto.response;

import back.backend.domain.place.entity.PlaceCategoryType;
import java.util.List;

public record PlaceSearchResponse(
        String googlePlaceId,
        String name,
        String address,
        double latitude,
        double longitude,
        String placeType,
        List<String> placeTypes,
        PlaceCategoryType recommendedCategoryType,
        String photoName,
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
