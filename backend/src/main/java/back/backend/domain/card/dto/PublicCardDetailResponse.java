package back.backend.domain.card.dto;

import back.backend.domain.itinerary.dto.response.ItineraryDayResponse;
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
        List<ItineraryDayResponse> itinerary
) {
}
