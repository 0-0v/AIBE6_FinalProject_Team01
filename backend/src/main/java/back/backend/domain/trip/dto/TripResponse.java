package back.backend.domain.trip.dto;

import back.backend.domain.trip.entity.CompanionType;
import back.backend.domain.trip.entity.TravelStyle;
import back.backend.domain.trip.entity.Trip;
import back.backend.domain.trip.entity.TripStatus;
import back.backend.domain.trip.entity.TripVisibility;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Set;

public record TripResponse(
        Long id,
        Long ownerId,
        String title,
        CompanionType companionType,
        Set<TravelStyle> travelStyles,
        String destination,
        LocalDate startDate,
        LocalDate endDate,
        String coverImageUrl,
        long memberCount,
        TripStatus status,
        TripVisibility visibility,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static TripResponse from(Trip trip, long memberCount) {
        return new TripResponse(
                trip.getId(), trip.getOwnerId(), trip.getTitle(), trip.getCompanionType(),
                trip.getTravelStyles(), trip.getDestination(), trip.getStartDate(), trip.getEndDate(),
                trip.getCoverImageUrl(), memberCount, trip.getStatus(), trip.getVisibility(),
                trip.getCreatedAt(), trip.getUpdatedAt());
    }
}
