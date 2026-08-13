package back.backend.domain.place.service;

import back.backend.domain.place.entity.Place;
import back.backend.domain.place.entity.PlaceRelation;
import back.backend.domain.place.entity.TripPlace;
import back.backend.domain.place.repository.PlaceRelationRepository;
import back.backend.domain.trip.entity.TravelStyle;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

@ExtendWith(MockitoExtension.class)
class PlaceRelationServiceTest {

    @Mock
    private PlaceStyleRelationService placeStyleRelationService;

    @Mock
    private PlaceRelationRepository placeRelationRepository;

    private PlaceRelationService service;

    @BeforeEach
    void setUp() {
        Clock clock = Clock.fixed(
                Instant.parse("2026-08-13T00:00:00Z"),
                ZoneId.of("Asia/Seoul")
        );
        service = new PlaceRelationService(
                placeStyleRelationService,
                placeRelationRepository,
                clock
        );
    }

    @Test
    @DisplayName("t1 스타일 벡터가 완전히 같은 두 장소는 관계 점수가 최대치에 가깝다")
    void t1_identicalStyleVectorsProduceHighRelationScore() {
        TripPlace first = tripPlace(1L, 10L);
        TripPlace second = tripPlace(2L, 11L);
        given(placeStyleRelationService.resolveStyleVectors(List.of(first, second)))
                .willReturn(Map.of(
                        1L, Map.of(TravelStyle.FOOD, 0.9, TravelStyle.SHOPPING, 0.2),
                        2L, Map.of(TravelStyle.FOOD, 0.9, TravelStyle.SHOPPING, 0.2)
                ));
        given(placeRelationRepository.findAllByPlaceIdsIn(anyList()))
                .willReturn(List.of());

        Map<Long, Map<Long, Double>> scores = service.resolvePairwiseRelationScores(
                List.of(first, second)
        );

        assertThat(scores.get(1L).get(2L))
                .isCloseTo(0.7, org.assertj.core.data.Offset.offset(0.001));
        assertThat(scores.get(2L).get(1L)).isEqualTo(scores.get(1L).get(2L));
    }

    @Test
    @DisplayName("t2 공동방문 이력이 있으면 관계 점수가 스타일 유사도보다 높아진다")
    void t2_coVisitHistoryIncreasesRelationScoreBeyondStyleSimilarity() {
        TripPlace first = tripPlace(1L, 10L);
        TripPlace second = tripPlace(2L, 11L);
        given(placeStyleRelationService.resolveStyleVectors(List.of(first, second)))
                .willReturn(Map.of(
                        1L, Map.of(TravelStyle.FOOD, 0.5),
                        2L, Map.of(TravelStyle.FOOD, 0.1)
                ));
        given(placeRelationRepository.findAllByPlaceIdsIn(anyList()))
                .willReturn(List.of(PlaceRelation.create(
                        10L, 11L, 9,
                        java.time.LocalDateTime.now()
                )));

        Map<Long, Map<Long, Double>> withCoVisit = service.resolvePairwiseRelationScores(
                List.of(first, second)
        );

        given(placeRelationRepository.findAllByPlaceIdsIn(anyList()))
                .willReturn(List.of());
        Map<Long, Map<Long, Double>> withoutCoVisit = service.resolvePairwiseRelationScores(
                List.of(first, second)
        );

        assertThat(withCoVisit.get(1L).get(2L))
                .isGreaterThan(withoutCoVisit.get(1L).get(2L));
    }

    @Test
    @DisplayName("t3 후보 장소가 2개 미만이면 빈 결과를 반환한다")
    void t3_fewerThanTwoPlacesReturnsEmptyMap() {
        Map<Long, Map<Long, Double>> scores = service.resolvePairwiseRelationScores(
                List.of(tripPlace(1L, 10L))
        );

        assertThat(scores).isEmpty();
    }

    @Test
    @DisplayName("t4 공동방문 이력을 재계산해 기존 데이터를 대체한다")
    void t4_recomputeCoVisitCountsReplacesExistingRows() {
        given(placeRelationRepository.aggregateCoVisitCounts())
                .willReturn(List.of(projection(10L, 11L, 4L)));

        service.recomputeCoVisitCounts();

        then(placeRelationRepository).should().deleteAllInBatch();
        then(placeRelationRepository).should().saveAll(anyList());
    }

    private PlaceRelationRepository.PlaceCoVisitProjection projection(
            Long fromPlaceId, Long toPlaceId, Long pairCount
    ) {
        return new PlaceRelationRepository.PlaceCoVisitProjection() {
            @Override public Long getFromPlaceId() { return fromPlaceId; }
            @Override public Long getToPlaceId() { return toPlaceId; }
            @Override public Long getPairCount() { return pairCount; }
        };
    }

    private TripPlace tripPlace(Long tripPlaceId, Long placeId) {
        Place place = Place.builder().name("장소 " + placeId).build();
        ReflectionTestUtils.setField(place, "id", placeId);
        TripPlace tripPlace = org.mockito.Mockito.mock(TripPlace.class);
        org.mockito.Mockito.lenient().when(tripPlace.getId()).thenReturn(tripPlaceId);
        org.mockito.Mockito.lenient().when(tripPlace.getPlace()).thenReturn(place);
        return tripPlace;
    }
}
