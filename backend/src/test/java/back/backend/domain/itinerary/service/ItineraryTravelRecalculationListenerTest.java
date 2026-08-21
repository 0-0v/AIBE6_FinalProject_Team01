package back.backend.domain.itinerary.service;

import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

import back.backend.domain.itinerary.entity.ItineraryDay;
import back.backend.domain.itinerary.entity.ItineraryItem;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class ItineraryTravelRecalculationListenerTest {

    @Mock ItineraryTravelSnapshotLoader snapshotLoader;
    @Mock ItineraryTravelEstimator travelEstimator;
    @Mock ItineraryTravelResultWriter resultWriter;

    @Test
    @DisplayName("t1 커밋 후 요청받은 변경 구간만 이동시간을 계산한다")
    void t1_recalculatesOnlyRequestedSegmentsAfterCommit() {
        ItineraryDay day = ItineraryDay.create(1L, LocalDate.of(2026, 8, 1), 1);
        ReflectionTestUtils.setField(day, "id", 10L);
        ItineraryItem first = ItineraryItem.create(day, 100L, 0);
        ItineraryItem second = ItineraryItem.create(day, 200L, 1);
        ItineraryItem third = ItineraryItem.create(day, 300L, 2);
        ReflectionTestUtils.setField(first, "id", 11L);
        ReflectionTestUtils.setField(second, "id", 12L);
        ReflectionTestUtils.setField(third, "id", 13L);
        List<ItineraryItem> items = List.of(first, second, third);
        when(snapshotLoader.load(1L, 10L))
                .thenReturn(new ItineraryTravelSnapshotLoader.Snapshot(day, items, Map.of()));
        ItineraryTravelRecalculationListener listener =
                new ItineraryTravelRecalculationListener(snapshotLoader, travelEstimator, resultWriter);

        listener.recalculate(new ItineraryTravelRecalculationRequested(
                1L,
                10L,
                List.of(new ItineraryTravelRecalculationRequested.Segment(12L, 200L, 300L)),
                null
        ));

        then(travelEstimator).should().recalculateAt(items, Map.of(), Set.of(1));
        verifyNoMoreInteractions(travelEstimator);
        ArgumentCaptor<ItineraryTravelResultWriter.Result> captor =
                ArgumentCaptor.forClass(ItineraryTravelResultWriter.Result.class);
        then(resultWriter).should().write(captor.capture());
        org.assertj.core.api.Assertions.assertThat(captor.getValue().segments())
                .singleElement()
                .satisfies(segment -> {
                    org.assertj.core.api.Assertions.assertThat(segment.itemId()).isEqualTo(12L);
                    org.assertj.core.api.Assertions.assertThat(segment.nextTripPlaceId()).isEqualTo(300L);
                });
    }

    @Test
    @DisplayName("t2 계산 전에 일정 구간이 변경됐으면 외부 API 계산을 건너뛴다")
    void t2_skipsExternalCalculationForStaleSegment() {
        ItineraryDay day = ItineraryDay.create(1L, LocalDate.of(2026, 8, 1), 1);
        ReflectionTestUtils.setField(day, "id", 10L);
        ItineraryItem first = ItineraryItem.create(day, 100L, 0);
        ItineraryItem changedNext = ItineraryItem.create(day, 999L, 1);
        ReflectionTestUtils.setField(first, "id", 11L);
        ReflectionTestUtils.setField(changedNext, "id", 12L);
        List<ItineraryItem> items = List.of(first, changedNext);
        when(snapshotLoader.load(1L, 10L))
                .thenReturn(new ItineraryTravelSnapshotLoader.Snapshot(day, items, Map.of()));
        ItineraryTravelRecalculationListener listener =
                new ItineraryTravelRecalculationListener(snapshotLoader, travelEstimator, resultWriter);

        listener.recalculate(new ItineraryTravelRecalculationRequested(
                1L,
                10L,
                List.of(new ItineraryTravelRecalculationRequested.Segment(11L, 100L, 200L)),
                null
        ));

        then(travelEstimator).shouldHaveNoInteractions();
        then(resultWriter).shouldHaveNoInteractions();
    }
}
