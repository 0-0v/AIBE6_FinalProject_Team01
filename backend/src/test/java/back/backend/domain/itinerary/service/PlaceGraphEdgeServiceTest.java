package back.backend.domain.itinerary.service;

import back.backend.domain.itinerary.entity.ItineraryTransportMode;
import back.backend.domain.place.entity.Place;
import back.backend.domain.place.entity.PlaceGraphEdge;
import back.backend.domain.place.repository.PlaceGraphEdgeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

@ExtendWith(MockitoExtension.class)
class PlaceGraphEdgeServiceTest {

    @Mock
    private PlaceGraphEdgeRepository repository;

    private PlaceGraphEdgeService service;
    private Place from;
    private Place to;

    @BeforeEach
    void setUp() {
        Clock clock = Clock.fixed(
                Instant.parse("2026-08-02T00:00:00Z"),
                ZoneOffset.UTC
        );
        service = new PlaceGraphEdgeService(repository, clock);
        from = place(1L, "출발지");
        to = place(2L, "도착지");
    }

    @Test
    @DisplayName("t1 유효한 장소 그래프 엣지가 있으면 캐시된 이동 정보를 반환한다")
    void t1_validEdgeReturnsCachedRoute() {
        PlaceGraphEdge edge = PlaceGraphEdge.create(
                from,
                to,
                ItineraryTransportMode.DRIVING.name(),
                3200,
                14,
                "GOOGLE_ROUTES",
                Instant.parse("2026-08-01T00:00:00Z"),
                Instant.parse("2026-08-08T00:00:00Z")
        );
        given(repository.findByRoute(1L, 2L, "DRIVING"))
                .willReturn(Optional.of(edge));

        var result = service.find(from, to, ItineraryTransportMode.DRIVING);

        assertThat(result).isPresent();
        assertThat(result.orElseThrow().distanceMeters()).isEqualTo(3200);
        assertThat(result.orElseThrow().travelMinutes()).isEqualTo(14);
    }

    @Test
    @DisplayName("t2 만료된 장소 그래프 엣지는 경로 캐시로 사용하지 않는다")
    void t2_expiredEdgeIsIgnored() {
        PlaceGraphEdge edge = PlaceGraphEdge.create(
                from,
                to,
                ItineraryTransportMode.WALKING.name(),
                500,
                7,
                "GOOGLE_ROUTES",
                Instant.parse("2026-07-20T00:00:00Z"),
                Instant.parse("2026-08-01T00:00:00Z")
        );
        given(repository.findByRoute(1L, 2L, "WALKING"))
                .willReturn(Optional.of(edge));

        assertThat(service.find(from, to, ItineraryTransportMode.WALKING))
                .isEmpty();
    }

    @Test
    @DisplayName("t3 실제 경로 조회 결과를 장소 그래프 엣지로 저장한다")
    void t3_routeResultIsStoredAsGraphEdge() {
        given(repository.findByRoute(1L, 2L, "DRIVING"))
                .willReturn(Optional.empty());

        service.cache(
                from,
                to,
                ItineraryTransportMode.DRIVING,
                4100,
                18
        );

        then(repository).should().save(org.mockito.ArgumentMatchers.argThat(
                edge -> edge.getDistanceMeters() == 4100
                        && edge.getTravelMinutes() == 18
                        && edge.getExpiresAt().isAfter(edge.getCachedAt())
        ));
    }

    private Place place(Long id, String name) {
        Place place = Place.builder()
                .googlePlaceId("google-" + id)
                .name(name)
                .address("테스트 주소")
                .latitude(java.math.BigDecimal.valueOf(37.5))
                .longitude(java.math.BigDecimal.valueOf(127.0))
                .build();
        ReflectionTestUtils.setField(place, "id", id);
        return place;
    }
}
