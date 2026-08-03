package back.backend.domain.card.dto;

import back.backend.domain.itinerary.dto.response.ItineraryDayResponse;
import back.backend.domain.trip.entity.TripVisibility;
import java.time.LocalDate;
import java.util.List;

public record PublicCardDetailResponse(
        Long cardId,
        Long tripId,
        String title,
        String summary,
        String destination,
        String coverImageUrl,
        LocalDate startDate,
        LocalDate endDate,
        TripVisibility visibility,
        List<ItineraryDayResponse> itinerary,
        List<PublicCardRecordResponse> records
) {
}
