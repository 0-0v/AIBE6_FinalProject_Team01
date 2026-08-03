package back.backend.domain.trip.dto;

import back.backend.domain.trip.entity.TripVisibility;
import java.util.List;

public record TripVisibilitySettingsResponse(
        TripVisibility visibility,
        List<String> tags,
        String description,
        int placeCount,
        int photoCount,
        int recordCount
) {
    public TripVisibilitySettingsResponse(TripVisibility visibility, List<String> tags) {
        this(visibility, tags, null, 0, 0, 0);
    }
}
