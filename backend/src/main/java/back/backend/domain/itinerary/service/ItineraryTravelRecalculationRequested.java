package back.backend.domain.itinerary.service;

import java.util.List;

record ItineraryTravelRecalculationRequested(
        Long tripId,
        Long dayId,
        List<Segment> segments,
        Long departureFirstItemId
) {
    ItineraryTravelRecalculationRequested {
        segments = List.copyOf(segments);
    }

    record Segment(Long itemId, Long tripPlaceId, Long nextTripPlaceId) {
    }
}
