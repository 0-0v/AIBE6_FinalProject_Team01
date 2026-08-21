package back.backend.domain.itinerary.service;

import back.backend.domain.itinerary.entity.ItineraryDay;
import back.backend.domain.itinerary.entity.ItineraryItem;
import back.backend.domain.itinerary.repository.ItineraryDayRepository;
import back.backend.domain.itinerary.repository.ItineraryItemRepository;
import back.backend.domain.trip.repository.TripRepository;
import back.backend.global.realtime.RealtimeEvent;
import java.math.BigDecimal;
import java.util.List;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
class ItineraryTravelResultWriter {

    private final TripRepository tripRepository;
    private final ItineraryDayRepository dayRepository;
    private final ItineraryItemRepository itemRepository;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional
    void write(Result result) {
        if (tripRepository.findByIdForUpdate(result.tripId()).isEmpty()) return;
        ItineraryDay day = dayRepository.findByIdAndTripId(result.dayId(), result.tripId()).orElse(null);
        if (day == null) return;

        List<ItineraryItem> currentItems = itemRepository.findAllByItineraryDayOrderBySortOrderAsc(day);
        for (SegmentResult segment : result.segments()) {
            int index = indexOf(currentItems, segment.itemId());
            if (index < 0) continue;
            Long currentNextTripPlaceId = index + 1 < currentItems.size()
                    ? currentItems.get(index + 1).getTripPlaceId()
                    : null;
            ItineraryItem current = currentItems.get(index);
            if (!Objects.equals(current.getTripPlaceId(), segment.tripPlaceId())
                    || !Objects.equals(currentNextTripPlaceId, segment.nextTripPlaceId())) {
                continue;
            }
            current.updateTravelInformation(
                    segment.minutes(),
                    segment.meters(),
                    segment.mode(),
                    segment.detail(),
                    segment.manual(),
                    segment.preference()
            );
        }

        if (result.departure() != null && !currentItems.isEmpty()) {
            DepartureResult departure = result.departure();
            ItineraryItem first = currentItems.getFirst();
            if (first.getId().equals(departure.firstItemId())
                    && Objects.equals(day.getDepartureType(), departure.type())
                    && same(day.getDepartureLat(), departure.latitude())
                    && same(day.getDepartureLng(), departure.longitude())) {
                day.updateDepartureTravelInfo(departure.minutes(), departure.meters(), departure.mode());
            }
        }
        eventPublisher.publishEvent(RealtimeEvent.activity(result.tripId(), "ITINERARY", result.dayId()));
    }

    private int indexOf(List<ItineraryItem> items, Long itemId) {
        for (int index = 0; index < items.size(); index++) {
            if (items.get(index).getId().equals(itemId)) return index;
        }
        return -1;
    }

    private boolean same(BigDecimal left, BigDecimal right) {
        return left == null ? right == null : right != null && left.compareTo(right) == 0;
    }

    record Result(Long tripId, Long dayId, List<SegmentResult> segments, DepartureResult departure) {
    }

    record SegmentResult(
            Long itemId,
            Long tripPlaceId,
            Long nextTripPlaceId,
            Integer minutes,
            Integer meters,
            String mode,
            String detail,
            boolean manual,
            String preference
    ) {
    }

    record DepartureResult(
            Long firstItemId,
            String type,
            BigDecimal latitude,
            BigDecimal longitude,
            Integer minutes,
            Integer meters,
            String mode
    ) {
    }
}
