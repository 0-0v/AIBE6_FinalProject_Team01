package back.backend.domain.admin.dto;

import back.backend.domain.trip.entity.Trip;
import back.backend.domain.trip.entity.TripStatus;
import back.backend.domain.trip.entity.TripVisibility;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record AdminTripSummaryResponse(
        Long id, String title, Long ownerId, TripStatus status, LocalDate startDate,
        LocalDate endDate, TripVisibility visibility, LocalDateTime createdAt
) {
    public static AdminTripSummaryResponse from(Trip trip) {
        return new AdminTripSummaryResponse(trip.getId(), trip.getTitle(), trip.getOwnerId(),
                trip.getStatus(), trip.getStartDate(), trip.getEndDate(), trip.getVisibility(),
                trip.getCreatedAt());
    }
}
