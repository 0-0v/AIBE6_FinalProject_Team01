package back.backend.domain.trip.dto;

import back.backend.domain.trip.entity.CompanionType;
import back.backend.domain.trip.entity.TravelPace;
import back.backend.domain.trip.entity.TravelStyle;
import back.backend.domain.trip.entity.TripVisibility;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Set;

public record TripRequest(
        @NotBlank(message = "여행방 이름은 필수입니다.")
        @Size(max = 100, message = "여행방 이름은 100자 이하여야 합니다.")
        String title,
        CompanionType companionType,
        Set<TravelStyle> travelStyles,
        @Size(max = 100, message = "여행 장소는 100자 이하여야 합니다.")
        String destination,
        Double destinationLat,
        Double destinationLng,
        LocalDate startDate,
        LocalDate endDate,
        @Schema(hidden = true)
        TripVisibility visibility,
        LocalTime dayStartTime,
        LocalTime dayEndTime,
        TravelPace travelPace
) {
    public TripRequest(
            String title,
            CompanionType companionType,
            Set<TravelStyle> travelStyles,
            String destination,
            LocalDate startDate,
            LocalDate endDate,
            TripVisibility visibility,
            LocalTime dayStartTime,
            LocalTime dayEndTime,
            TravelPace travelPace
    ) {
        this(title, companionType, travelStyles, destination, null, null, startDate, endDate,
                visibility, dayStartTime, dayEndTime, travelPace);
    }

    public Set<TravelStyle> normalizedTravelStyles() {
        return travelStyles == null ? Set.of() : Set.copyOf(travelStyles);
    }
}
