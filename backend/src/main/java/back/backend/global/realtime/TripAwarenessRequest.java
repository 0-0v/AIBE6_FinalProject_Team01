package back.backend.global.realtime;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record TripAwarenessRequest(
        @NotBlank
        @Pattern(regexp = "places|itinerary|schedule|record")
        String workspace,
        @Min(1) Integer selectedDay,
        @Size(max = 255) String selectedPlaceId,
        @Size(max = 100) String selectedPlaceName,
        @DecimalMin("-90.0") @DecimalMax("90.0") Double mapLat,
        @DecimalMin("-180.0") @DecimalMax("180.0") Double mapLng,
        @DecimalMin("0.0") @DecimalMax("22.0") Double mapZoom,
        @Size(max = 30) String editingType,
        @Size(max = 255) String editingTargetId,
        @Size(max = 80) String editingLabel
) {
}
