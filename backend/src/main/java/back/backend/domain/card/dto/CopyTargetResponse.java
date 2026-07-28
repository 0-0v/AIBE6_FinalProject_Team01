package back.backend.domain.card.dto;

import back.backend.domain.trip.entity.Trip;
import java.time.LocalDate;

public record CopyTargetResponse(
        Long tripId,
        String title,
        String destination,
        LocalDate startDate,
        LocalDate endDate,
        String coverImageUrl,
        boolean hasItinerary
) {
    public static CopyTargetResponse from(Trip trip, boolean hasItinerary) {
        return new CopyTargetResponse(
                trip.getId(), trip.getTitle(), trip.getDestination(),
                trip.getStartDate(), trip.getEndDate(), trip.getCoverImageUrl(),
                hasItinerary);
    }
}
