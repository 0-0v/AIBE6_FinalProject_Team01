package back.backend.domain.itinerary.dto.response;

import back.backend.domain.itinerary.entity.ItineraryDay;
import back.backend.domain.place.entity.TripPlace;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public record ItineraryDayResponse(
    Long id,
    LocalDate itineraryDate,
    int dayNumber,
    String title,
    String status,
    List<ItineraryItemResponse> items
) {
    public static ItineraryDayResponse from(ItineraryDay day, Map<Long, TripPlace> tripPlaceMap) {
        List<ItineraryItemResponse> itemResponses = day.getItems().stream()
            .map(item -> {
                TripPlace tp = item.getTripPlaceId() != null
                    ? tripPlaceMap.get(item.getTripPlaceId())
                    : null;
                return ItineraryItemResponse.from(item, tp);
            })
            .toList();

        return new ItineraryDayResponse(
            day.getId(),
            day.getItineraryDate(),
            day.getDayNumber(),
            day.getTitle(),
            day.getStatus().name(),
            itemResponses
        );
    }
}
