package back.backend.domain.itinerary.service;

import back.backend.domain.itinerary.entity.ItineraryDay;
import back.backend.domain.itinerary.entity.ItineraryItem;
import back.backend.domain.itinerary.repository.ItineraryDayRepository;
import back.backend.domain.itinerary.repository.ItineraryItemRepository;
import back.backend.domain.place.entity.TripPlace;
import back.backend.domain.place.repository.TripPlaceRepository;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
class ItineraryTravelSnapshotLoader {

    private final ItineraryDayRepository dayRepository;
    private final ItineraryItemRepository itemRepository;
    private final TripPlaceRepository tripPlaceRepository;

    @Transactional(readOnly = true)
    Snapshot load(Long tripId, Long dayId) {
        ItineraryDay day = dayRepository.findByIdAndTripId(dayId, tripId).orElse(null);
        if (day == null) return null;

        List<ItineraryItem> items = itemRepository.findAllByItineraryDayOrderBySortOrderAsc(day);
        // 외부 API 호출 전에 지연 로딩을 끝내 DB 커넥션이 필요하지 않게 한다.
        items.forEach(item -> item.getItineraryDay().getItineraryDate());
        Set<Long> tripPlaceIds = items.stream()
                .map(ItineraryItem::getTripPlaceId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<Long, TripPlace> tripPlaces = tripPlaceIds.isEmpty()
                ? Map.of()
                : tripPlaceRepository.findAllById(tripPlaceIds).stream()
                        .collect(Collectors.toMap(TripPlace::getId, Function.identity()));
        tripPlaces.values().forEach(tripPlace -> tripPlace.getPlace().getGooglePlaceId());
        return new Snapshot(day, List.copyOf(items), Map.copyOf(tripPlaces));
    }

    record Snapshot(
            ItineraryDay day,
            List<ItineraryItem> items,
            Map<Long, TripPlace> tripPlaces
    ) {
    }
}
