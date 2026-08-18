package back.backend.domain.place.service;

import back.backend.domain.place.entity.Place;
import back.backend.domain.place.entity.PlaceCategory;
import back.backend.domain.place.entity.PlaceCategoryType;
import back.backend.domain.place.entity.PlaceMarkerIcon;
import back.backend.domain.place.entity.PlaceStyleTag;
import back.backend.domain.place.entity.TripPlace;
import back.backend.domain.place.repository.PlaceStyleTagRepository;
import back.backend.domain.trip.entity.TravelStyle;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Set;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

@ExtendWith(MockitoExtension.class)
class PlaceStyleRelationServiceTest {

    @Mock
    private PlaceStyleTagRepository repository;

    private PlaceStyleRelationService service;

    @BeforeEach
    void setUp() {
        service = new PlaceStyleRelationService(repository);
    }

    @Test
    @DisplayName("t1 음식점은 맛집 여행 스타일과 높은 관계 점수를 가진다")
    void t1_foodCategoryHasHighFoodStyleScore() {
        double score = service.calculateCompatibility(
                PlaceCategoryType.FOOD,
                Set.of(TravelStyle.FOOD)
        );

        assertThat(score).isEqualTo(0.95);
    }

    @Test
    @DisplayName("t2 장소 등록 시 서비스 규칙으로 생성한 스타일 관계를 저장한다")
    void t2_saveCategoryRelationsStoresServiceOwnedScores() {
        Place place = Place.builder().name("테스트 장소").build();
        ReflectionTestUtils.setField(place, "id", 7L);
        given(repository.findAllByPlaceId(7L)).willReturn(List.of());

        service.saveCategoryRelations(place, PlaceCategoryType.NATURE);

        then(repository).should().saveAll(anyList());
    }

    @Test
    @DisplayName("t3 저장된 관계 점수가 있으면 기본 카테고리 점수보다 우선한다")
    void t3_storedRelationOverridesCategoryDefault() {
        PlaceStyleTag tag = PlaceStyleTag.create(
                Place.builder().name("테스트 장소").build(),
                TravelStyle.SHOPPING,
                0.88,
                "USER_ACTIVITY"
        );
        given(repository.findAllByPlaceId(9L)).willReturn(List.of(tag));

        double score = service.resolveCompatibility(
                9L,
                PlaceCategoryType.NATURE,
                Set.of(TravelStyle.SHOPPING)
        );

        assertThat(score).isEqualTo(0.88);
    }

    @Test
    @DisplayName("t5 전체 여행 스타일에 대한 장소 점수 벡터를 만든다")
    void t5_resolveStyleVectorsBuildsFullDimensionVector() {
        Place place = Place.builder().name("카페").build();
        ReflectionTestUtils.setField(place, "id", 21L);
        TripPlace tripPlace = org.mockito.Mockito.mock(TripPlace.class);
        given(tripPlace.getId()).willReturn(31L);
        given(tripPlace.getPlace()).willReturn(place);
        PlaceStyleTag tag = PlaceStyleTag.create(
                place,
                TravelStyle.SNS_HOT_PLACE,
                0.80,
                "USER_ACTIVITY"
        );
        given(repository.findAllByPlaceIdIn(List.of(21L))).willReturn(List.of(tag));

        Map<Long, Map<TravelStyle, Double>> vectors = service.resolveStyleVectors(
                List.of(tripPlace)
        );

        Map<TravelStyle, Double> vector = vectors.get(31L);
        assertThat(vector.get(TravelStyle.SNS_HOT_PLACE)).isEqualTo(0.80);
        assertThat(vector.get(TravelStyle.FOOD)).isEqualTo(0.1);
        assertThat(vector).hasSize(TravelStyle.values().length);
    }

    @Test
    @DisplayName("t6 저장된 스타일 태그가 없으면 카테고리 기본값으로 벡터를 채운다")
    void t6_resolveStyleVectorsFallsBackToCategoryDefaults() {
        Place place = Place.builder().name("음식점").build();
        ReflectionTestUtils.setField(place, "id", 22L);
        PlaceCategory category = PlaceCategory.builder()
                .name("음식점")
                .tripId(1L)
                .categoryType(PlaceCategoryType.FOOD)
                .markerColor("#f97316")
                .markerIcon(PlaceMarkerIcon.LANDMARK)
                .build();
        TripPlace tripPlace = org.mockito.Mockito.mock(TripPlace.class);
        given(tripPlace.getId()).willReturn(32L);
        given(tripPlace.getPlace()).willReturn(place);
        given(tripPlace.getCategory()).willReturn(category);
        given(repository.findAllByPlaceIdIn(List.of(22L))).willReturn(List.of());

        Map<Long, Map<TravelStyle, Double>> vectors = service.resolveStyleVectors(
                List.of(tripPlace)
        );

        assertThat(vectors.get(32L).get(TravelStyle.FOOD)).isEqualTo(0.95);
        assertThat(vectors.get(32L).get(TravelStyle.SNS_HOT_PLACE)).isEqualTo(0.55);
        assertThat(vectors.get(32L).get(TravelStyle.SHOPPING)).isEqualTo(0.1);
    }
}
