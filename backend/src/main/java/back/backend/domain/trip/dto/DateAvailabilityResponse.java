package back.backend.domain.trip.dto;

import java.time.LocalDate;
import java.util.List;

public record DateAvailabilityResponse(
        Long memberId,
        String nickname,
        String profileImageUrl,
        List<LocalDate> availableDates
) {
}
