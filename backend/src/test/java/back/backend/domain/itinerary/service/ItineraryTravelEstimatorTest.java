package back.backend.domain.itinerary.service;

import back.backend.domain.itinerary.entity.ItineraryDay;
import back.backend.domain.itinerary.entity.ItineraryItem;
import back.backend.domain.itinerary.entity.ItineraryTransportMode;
import back.backend.domain.place.entity.Place;
import back.backend.domain.place.entity.TripPlace;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.ArgumentMatchers.nullable;
import static org.mockito.ArgumentMatchers.eq;

@ExtendWith(MockitoExtension.class)
class ItineraryTravelEstimatorTest {

    @Mock
    private GoogleRoutesClient routesClient;

    @Test
    @DisplayName("t1 일정 순서에 따라 다음 장소까지 예상 이동정보를 계산한다")
    void t1_recalculateAssignsTravelToNextPlace() {
        ItineraryTravelEstimator estimator =
                new ItineraryTravelEstimator(routesClient);
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
        ItineraryTravelEstimator estimator =
                new ItineraryTravelEstimator(routesClient);
        ItineraryDay day = ItineraryDay.create(
                1L,
                LocalDate.of(2026, 8, 1),
                1
        );
        ItineraryItem item = ItineraryItem.create(day, 10L, 0);
        item.updateDetails(null, null, null, 20, 1000, "대중교통");

        estimator.recalculate(List.of(item), Map.of());

        assertThat(item.getTransportMinutes()).isNull();
        assertThat(item.getTransportMeters()).isNull();
    }

    @Test
    @DisplayName("t3 지하철을 선택하면 지하철 경로로 이동정보를 다시 계산한다")
    void t3_recalculateSegmentUsesSelectedSubwayMode() {
        ItineraryTravelEstimator estimator =
                new ItineraryTravelEstimator(routesClient);
        ItineraryDay day = ItineraryDay.create(
                1L,
                LocalDate.of(2026, 8, 1),
                1
        );
        ItineraryItem item = ItineraryItem.create(day, 10L, 0);
        TripPlace from = tripPlace(10L, 33.4500, 126.5000);
        TripPlace to = tripPlace(11L, 33.4600, 126.5100);
        given(routesClient.getRouteInfo(
                eq(33.4500),
                eq(126.5000),
                eq(33.4600),
                eq(126.5100),
                eq("transit"),
                eq("subway"),
                nullable(java.time.Instant.class)
        )).willReturn(java.util.Optional.of(
                new GoogleRoutesClient.RouteInfo(
                        2100,
                        18,
                        "지하철",
                        "서울역 → 1호선 → 시청역"
                )
        ));

        estimator.recalculateSegment(
                item,
                from,
                to,
                ItineraryTransportMode.SUBWAY
        );

        assertThat(item.getTransportMode()).isEqualTo("지하철");
        assertThat(item.getTransportMinutes()).isEqualTo(18);
        assertThat(item.getTransportMeters()).isEqualTo(2100);
        assertThat(item.getTransportDetail())
                .isEqualTo("서울역 → 1호선 → 시청역");
        assertThat(item.isTransportModeManual()).isTrue();
    }

    @Test
    @DisplayName("t4 일정 재계산 후에도 사용자가 선택한 이동수단을 유지한다")
    void t4_recalculatePreservesManuallySelectedMode() {
        ItineraryTravelEstimator estimator =
                new ItineraryTravelEstimator(routesClient);
        ItineraryDay day = ItineraryDay.create(
                1L,
                LocalDate.of(2026, 8, 1),
                1
        );
        ItineraryItem first = ItineraryItem.create(day, 10L, 0);
        ItineraryItem second = ItineraryItem.create(day, 11L, 1);
        first.updateTravelInformation(
                10,
                1000,
                "택시",
                null,
                true,
                "TAXI"
        );

        estimator.recalculate(
                List.of(first, second),
                Map.of(
                        10L, tripPlace(10L, 33.4500, 126.5000),
                        11L, tripPlace(11L, 33.4600, 126.5100)
                )
        );

        assertThat(first.getTransportMode()).isEqualTo("택시");
        assertThat(first.isTransportModeManual()).isTrue();
    }

    @Test
    @DisplayName("t5 실제 경로가 버스여도 사용자의 지하철 선호를 별도로 보존한다")
    void t5_keepsPreferenceWhenActualTransitModeDiffers() {
        ItineraryTravelEstimator estimator =
                new ItineraryTravelEstimator(routesClient);
        ItineraryDay day = ItineraryDay.create(
                1L,
                LocalDate.of(2026, 8, 1),
                1
        );
        ItineraryItem item = ItineraryItem.create(day, 10L, 0);
        TripPlace from = tripPlace(10L, 33.4500, 126.5000);
        TripPlace to = tripPlace(11L, 33.4600, 126.5100);
        given(routesClient.getRouteInfo(
                eq(33.4500),
                eq(126.5000),
                eq(33.4600),
                eq(126.5100),
                eq("transit"),
                eq("subway"),
                nullable(java.time.Instant.class)
        )).willReturn(java.util.Optional.of(
                new GoogleRoutesClient.RouteInfo(
                        2200,
                        20,
                        "버스",
                        "서울역 → 701번 → 시청"
                )
        ));

        estimator.recalculateSegment(
                item,
                from,
                to,
                ItineraryTransportMode.SUBWAY
        );

        assertThat(item.getTransportMode()).isEqualTo("버스");
        assertThat(item.getTransportModePreference()).isEqualTo("SUBWAY");
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
