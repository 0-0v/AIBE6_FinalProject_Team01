package back.backend.domain.itinerary.service;

import back.backend.domain.itinerary.entity.ItineraryDay;
import back.backend.domain.itinerary.entity.ItineraryItem;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Slf4j
@Component
@RequiredArgsConstructor
class ItineraryTravelRecalculationListener {

    private final ItineraryTravelSnapshotLoader snapshotLoader;
    private final ItineraryTravelEstimator travelEstimator;
    private final ItineraryTravelResultWriter resultWriter;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void recalculate(ItineraryTravelRecalculationRequested request) {
        try {
            ItineraryTravelSnapshotLoader.Snapshot snapshot =
                    snapshotLoader.load(request.tripId(), request.dayId());
            if (snapshot == null) return;

            List<ItineraryItem> ordered = snapshot.items().stream()
                    .sorted(Comparator.comparingInt(ItineraryItem::getSortOrder))
                    .toList();
            Set<Integer> validIndices = validIndices(ordered, request.segments());
            boolean validDeparture = request.departureFirstItemId() != null
                    && !ordered.isEmpty()
                    && ordered.getFirst().getId().equals(request.departureFirstItemId());
            if (validIndices.isEmpty() && !validDeparture) return;
            travelEstimator.recalculateAt(ordered, snapshot.tripPlaces(), validIndices);

            ItineraryDay day = snapshot.day();
            ItineraryTravelResultWriter.DepartureResult departure = null;
            if (validDeparture) {
                travelEstimator.recalculateDeparture(day, ordered, snapshot.tripPlaces());
                departure = new ItineraryTravelResultWriter.DepartureResult(
                        ordered.getFirst().getId(),
                        day.getDepartureType(),
                        day.getDepartureLat(),
                        day.getDepartureLng(),
                        day.getDepartureTravelMinutes(),
                        day.getDepartureTravelMeters(),
                        day.getDepartureTravelMode()
                );
            }

            List<ItineraryTravelResultWriter.SegmentResult> segments = validIndices.stream()
                    .map(index -> toResult(index, ordered))
                    .toList();
            resultWriter.write(new ItineraryTravelResultWriter.Result(
                    request.tripId(), request.dayId(), segments, departure));
        } catch (RuntimeException exception) {
            // 일정 저장은 이미 완료됐으므로 외부 API 실패가 사용자 변경을 되돌리지 않게 한다.
            log.warn("커밋 후 일정 이동시간 계산 실패 — tripId={}, dayId={}",
                    request.tripId(), request.dayId(), exception);
        }
    }

    private Set<Integer> validIndices(
            List<ItineraryItem> items,
            List<ItineraryTravelRecalculationRequested.Segment> requested
    ) {
        return IntStream.range(0, items.size())
                .filter(index -> requested.stream().anyMatch(segment -> matches(items, index, segment)))
                .boxed()
                .collect(Collectors.toSet());
    }

    private ItineraryTravelResultWriter.SegmentResult toResult(
            int index,
            List<ItineraryItem> items
    ) {
        ItineraryItem calculated = items.get(index);
        Long nextTripPlaceId = index + 1 < items.size()
                ? items.get(index + 1).getTripPlaceId()
                : null;
        return new ItineraryTravelResultWriter.SegmentResult(
                calculated.getId(),
                calculated.getTripPlaceId(),
                nextTripPlaceId,
                calculated.getTransportMinutes(),
                calculated.getTransportMeters(),
                calculated.getTransportMode(),
                calculated.getTransportDetail(),
                calculated.isTransportModeManual(),
                calculated.getTransportModePreference()
        );
    }

    private boolean matches(
            List<ItineraryItem> items,
            int index,
            ItineraryTravelRecalculationRequested.Segment segment
    ) {
        ItineraryItem current = items.get(index);
        Long nextTripPlaceId = index + 1 < items.size()
                ? items.get(index + 1).getTripPlaceId()
                : null;
        return Objects.equals(current.getId(), segment.itemId())
                && Objects.equals(current.getTripPlaceId(), segment.tripPlaceId())
                && Objects.equals(nextTripPlaceId, segment.nextTripPlaceId());
    }
}
