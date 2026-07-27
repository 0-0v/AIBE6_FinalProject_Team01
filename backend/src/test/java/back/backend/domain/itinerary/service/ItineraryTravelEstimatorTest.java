package back.backend.domain.itinerary.service;

import back.backend.domain.itinerary.entity.ItineraryDay;
import back.backend.domain.itinerary.entity.ItineraryItem;
import back.backend.domain.place.entity.Place;
import back.backend.domain.place.entity.TripPlace;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ItineraryTravelEstimatorTest {

    private final ItineraryTravelEstimator estimator =
            new ItineraryTravelEstimator();

    @Test
    @DisplayName("t1 일정 순서에 따라 다음 장소까지 예상 이동정보를 계산한다")
    void t1_recalculateAssignsTravelToNextPlace() {
        ItineraryDay day = ItineraryDay.create(
                1L,
                LocalDate.of(2026, 8, 1),
                1
        );
        ItineraryItem first = ItineraryItem.create(day, 10L, 0);
        ItineraryItem second = ItineraryItem.create(day, 11L, 1);

        estimator.recalculate(
                List.of(first, second),
                Map.of(
                        10L, tripPlace(10L, 33.4500, 126.5000),
                        11L, tripPlace(11L, 33.4600, 126.5100)
                )
        );

        assertThat(first.getTransportMinutes()).isPositive();
        assertThat(first.getTransportMeters()).isPositive();
        assertThat(second.getTransportMinutes()).isNull();
        assertThat(second.getTransportMeters()).isNull();
    }

    @Test
    @DisplayName("t2 장소 좌표가 없으면 이동정보를 비운다")
    void t2_recalculateClearsTravelWhenPlaceIsMissing() {
        ItineraryDay day = ItineraryDay.create(
                1L,
                LocalDate.of(2026, 8, 1),
                1
        );
        ItineraryItem item = ItineraryItem.create(day, 10L, 0);
        item.updateDetails(null, null, null, 20, 1000);

        estimator.recalculate(List.of(item), Map.of());

        assertThat(item.getTransportMinutes()).isNull();
        assertThat(item.getTransportMeters()).isNull();
    }

    private TripPlace tripPlace(Long id, double latitude, double longitude) {
        Place place = Place.builder()
                .googlePlaceId("google-" + id)
                .name("장소 " + id)
                .latitude(BigDecimal.valueOf(latitude))
                .longitude(BigDecimal.valueOf(longitude))
                .build();
        return TripPlace.builder().id(id).place(place).build();
    }
}
