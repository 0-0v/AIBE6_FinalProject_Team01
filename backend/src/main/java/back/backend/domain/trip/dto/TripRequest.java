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
        @Size(max = 3, message = "여행 스타일은 최대 3개까지 선택할 수 있습니다.")
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
        TravelPace travelPace,
        @Size(max = 100, message = "목적지 영문명은 100자 이하여야 합니다.")
        String destinationEnglishName,
        @Size(max = 2, message = "목적지 국가 코드는 2자 이하여야 합니다.")
        String destinationCountryCode
) {
    public TripRequest(
            String title, CompanionType companionType, Set<TravelStyle> travelStyles,
            String destination, Double destinationLat, Double destinationLng,
            LocalDate startDate, LocalDate endDate, TripVisibility visibility,
            LocalTime dayStartTime, LocalTime dayEndTime, TravelPace travelPace
    ) {
        this(title, companionType, travelStyles, destination, destinationLat, destinationLng,
                startDate, endDate, visibility, dayStartTime, dayEndTime, travelPace, null, null);
    }

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
                visibility, dayStartTime, dayEndTime, travelPace, null, null);
    }

    public Set<TravelStyle> normalizedTravelStyles() {
        return travelStyles == null ? Set.of() : Set.copyOf(travelStyles);
    }
}
