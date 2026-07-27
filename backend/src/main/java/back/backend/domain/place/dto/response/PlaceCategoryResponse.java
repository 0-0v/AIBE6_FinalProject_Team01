package back.backend.domain.place.dto.response;

import back.backend.domain.place.entity.PlaceCategory;
import back.backend.domain.place.entity.PlaceCategoryType;
import back.backend.domain.place.entity.PlaceMarkerIcon;

public record PlaceCategoryResponse(
        Long categoryId,
        String name,
        PlaceCategoryType categoryType,
        String markerColor,
        PlaceMarkerIcon markerIcon
) {
    public static PlaceCategoryResponse from(PlaceCategory category) {
        return new PlaceCategoryResponse(
                category.getId(),
                category.getName(),
                category.getCategoryType(),
                category.getMarkerColor(),
                category.getMarkerIcon()
        );
    }
}
