package back.backend.domain.admin.dto;

import back.backend.domain.admin.entity.TripCoverPreset;
import java.time.LocalDateTime;

public record TripCoverPresetResponse(
        Long id, String presetKey, String imageUrl, boolean active,
        int sortOrder, LocalDateTime createdAt
) {
    public static TripCoverPresetResponse from(TripCoverPreset preset) {
        return new TripCoverPresetResponse(preset.getId(), preset.getPresetKey(),
                preset.getImageUrl(), preset.isActive(), preset.getSortOrder(), preset.getCreatedAt());
    }
}
