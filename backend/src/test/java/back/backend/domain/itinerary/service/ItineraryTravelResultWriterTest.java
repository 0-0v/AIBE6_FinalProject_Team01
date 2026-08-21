package back.backend.domain.itinerary.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import back.backend.domain.itinerary.entity.ItineraryDay;
import back.backend.domain.itinerary.entity.ItineraryItem;
import back.backend.domain.itinerary.repository.ItineraryDayRepository;
import back.backend.domain.itinerary.repository.ItineraryItemRepository;
import back.backend.domain.trip.entity.Trip;
import back.backend.domain.trip.repository.TripRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class ItineraryTravelResultWriterTest {

    @Mock TripRepository tripRepository;
    @Mock ItineraryDayRepository dayRepository;
    @Mock ItineraryItemRepository itemRepository;
    @Mock ApplicationEventPublisher eventPublisher;

    @Test
    @DisplayName("t1 계산 중 다음 장소가 변경되면 오래된 이동시간 결과를 저장하지 않는다")
    void t1_skipsStaleResultWhenSegmentChanged() {
        ItineraryDay day = ItineraryDay.create(1L, LocalDate.of(2026, 8, 1), 1);
        ReflectionTestUtils.setField(day, "id", 10L);
        ItineraryItem first = ItineraryItem.create(day, 100L, 0);
        ItineraryItem changedNext = ItineraryItem.create(day, 999L, 1);
        ReflectionTestUtils.setField(first, "id", 11L);
        ReflectionTestUtils.setField(changedNext, "id", 12L);
        first.updateTravelInformation(3, 100, "도보");
        when(tripRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(mock(Trip.class)));
        when(dayRepository.findByIdAndTripId(10L, 1L)).thenReturn(Optional.of(day));
        when(itemRepository.findAllByItineraryDayOrderBySortOrderAsc(day))
                .thenReturn(List.of(first, changedNext));
        ItineraryTravelResultWriter writer = new ItineraryTravelResultWriter(
                tripRepository, dayRepository, itemRepository, eventPublisher);

        writer.write(new ItineraryTravelResultWriter.Result(
                1L,
                10L,
                List.of(new ItineraryTravelResultWriter.SegmentResult(
                        11L, 100L, 200L, 30, 5_000, "자동차", null, false, null)),
                null
        ));

        assertThat(first.getTransportMinutes()).isEqualTo(3);
        assertThat(first.getTransportMeters()).isEqualTo(100);
        assertThat(first.getTransportMode()).isEqualTo("도보");
    }
}
