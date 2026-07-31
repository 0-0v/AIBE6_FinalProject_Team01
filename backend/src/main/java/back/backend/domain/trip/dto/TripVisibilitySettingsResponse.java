package back.backend.domain.trip.dto;

import back.backend.domain.trip.entity.TripVisibility;
import java.util.List;

public record TripVisibilitySettingsResponse(
        TripVisibility visibility,
        List<String> tags
) {
}
