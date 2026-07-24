package back.backend.domain.place.dto.response;

import back.backend.domain.place.entity.PlaceCategory;
import back.backend.domain.place.entity.PlaceCategoryType;

public record PlaceCategoryResponse(
        Long categoryId,
        String name,
        PlaceCategoryType categoryType,
        String markerColor,
        String markerIcon,
        int sortOrder
) {
    public static PlaceCategoryResponse from(PlaceCategory category) {
        if (category == null) {
            return null;
        }
        return new PlaceCategoryResponse(
                category.getId(),
                category.getName(),
                category.getCategoryType(),
                category.getMarkerColor(),
                category.getMarkerIcon(),
                category.getSortOrder()
        );
    }
}
