package back.backend.domain.itinerary.service;

import java.time.LocalTime;

public record PlaceScheduleConstraint(
        Long dayId,
        LocalTime earliestStartTime,
        String reason
) {
}
