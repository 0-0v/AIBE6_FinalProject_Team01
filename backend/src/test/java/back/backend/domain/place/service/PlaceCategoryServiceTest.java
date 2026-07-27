package back.backend.domain.place.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;

import back.backend.domain.place.dto.response.PlaceCategoryResponse;
import back.backend.domain.place.entity.PlaceCategory;
import back.backend.domain.place.entity.PlaceCategoryType;
import back.backend.domain.place.entity.PlaceMarkerIcon;
import back.backend.domain.place.repository.PlaceCategoryInitializationLockRepository;
import back.backend.domain.place.repository.PlaceCategoryRepository;
import java.util.EnumMap;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class PlaceCategoryServiceTest {

    @Mock PlaceCategoryRepository categoryRepository;
    @Mock PlaceCategoryInitializationLockRepository initializationLockRepository;
    @Mock TripAccessChecker accessChecker;
    @InjectMocks PlaceCategoryService categoryService;

    private PlaceCategory food;
    private PlaceCategory other;

    @BeforeEach
    void setUp() {
        lenient().when(accessChecker.requireView(1L)).thenReturn(10L);
        food = category(1L, "음식점", PlaceCategoryType.FOOD, 0);
        other = category(2L, "기타", PlaceCategoryType.OTHER, 1);
    }

    @Test
    @DisplayName("t1 여행방 카테고리를 정렬 순서대로 조회한다")
    void t1_getCategoriesReturnsOrderedCategories() {
        given(categoryRepository.findAllByTripIdOrderBySortOrderAscIdAsc(1L))
                .willReturn(completeCategories());

        List<PlaceCategoryResponse> result = categoryService.getCategories(1L);

        assertThat(result).extracting(PlaceCategoryResponse::name)
                .containsExactly(
                        "음식점", "카페", "술집", "명소", "자연",
                        "숙소", "쇼핑", "액티비티", "교통", "기타"
                );
        then(initializationLockRepository).should(never()).lockTrip(1L);
        then(categoryRepository).should().findAllByTripIdOrderBySortOrderAscIdAsc(1L);
    }

    @Test
    @DisplayName("t2 Google 장소 유형에 맞는 기본 카테고리를 추천한다")
    void t2_recommendCategoryUsesGooglePlaceType() {
        given(categoryRepository.findAllByTripIdOrderBySortOrderAscIdAsc(1L))
                .willReturn(completeCategories());
        PlaceCategory result = categoryService.recommend(
                1L,
                "벳푸 라멘",
                "ramen_restaurant",
                List.of("ramen_restaurant")
        );

        assertThat(result).isEqualTo(food);
        then(initializationLockRepository).should(never()).lockTrip(1L);
    }

    @Test
    @DisplayName("t3 다양한 숙박 명칭과 Google 장소 유형을 숙소로 추천한다")
    void t3_recommendCategoryRecognizesLodgingVariants() {
        PlaceCategory lodging = category(3L, "숙소", PlaceCategoryType.LODGING, 2);
        given(categoryRepository.findAllByTripIdOrderBySortOrderAscIdAsc(1L))
                .willReturn(completeCategories(lodging));

        List<PlaceCategory> results = List.of(
                categoryService.recommend(1L, "제주 에어비앤비", null, List.of()),
                categoryService.recommend(1L, "바다 전망 펜션", null, List.of()),
                categoryService.recommend(1L, "성산 게스트하우스", "guest_house", List.of("guest_house")),
                categoryService.recommend(1L, "숲속 글램핑", "campground", List.of("campground")),
                categoryService.recommend(1L, "도심형 숙박시설", "extended_stay_hotel",
                        List.of("extended_stay_hotel"))
        );

        assertThat(results).containsOnly(lodging);
    }

    @Test
    @DisplayName("t4 술집, 교통, 액티비티 장소 유형을 각각의 기본 카테고리로 추천한다")
    void t4_recommendCategoryRecognizesTravelCategoryTypes() {
        PlaceCategory bar = category(4L, "술집", PlaceCategoryType.BAR, 2);
        PlaceCategory transport = category(5L, "교통", PlaceCategoryType.TRANSPORT, 3);
        PlaceCategory activity = category(6L, "액티비티", PlaceCategoryType.ACTIVITY, 4);
        given(categoryRepository.findAllByTripIdOrderBySortOrderAscIdAsc(1L))
                .willReturn(completeCategories(bar, transport, activity));

        assertThat(categoryService.recommend(1L, "루프탑 펍", "bar", List.of("bar")))
                .isEqualTo(bar);
        assertThat(categoryService.recommend(1L, "제주 국제공항", "airport", List.of("airport")))
                .isEqualTo(transport);
        assertThat(categoryService.recommend(
                1L, "오션 워터파크", "water_park", List.of("water_park")))
                .isEqualTo(activity);
        assertThat(categoryService.recommend(
                1L,
                "유니버설 스튜디오 재팬",
                "amusement_center",
                List.of("amusement_center")
        )).isEqualTo(activity);
    }

    @Test
    @DisplayName("t5 카테고리가 없는 여행방은 확장된 기본 카테고리를 자동 생성한다")
    void t5_emptyTripCreatesDefaultCategories() {
        given(categoryRepository.findAllByTripIdOrderBySortOrderAscIdAsc(1L))
                .willReturn(List.of());

        categoryService.ensureDefaults(1L);

        then(initializationLockRepository).should().lockTrip(1L);
        then(categoryRepository).should().saveAll(
                org.mockito.ArgumentMatchers.<Iterable<PlaceCategory>>argThat(categories -> {
                    List<PlaceCategory> saved = java.util.stream.StreamSupport
                            .stream(categories.spliterator(), false)
                            .toList();
                    return saved.size() == 10
                            && saved.get(0).getCategoryType() == PlaceCategoryType.FOOD
                            && saved.get(2).getCategoryType() == PlaceCategoryType.BAR
                            && saved.get(7).getCategoryType() == PlaceCategoryType.ACTIVITY
                            && saved.get(9).getCategoryType() == PlaceCategoryType.OTHER;
                })
        );
    }

    @Test
    @DisplayName("t6 일부 기본 카테고리만 있으면 누락된 유형만 생성한다")
    void t6_partialCategoriesCreateOnlyMissingDefaults() {
        given(categoryRepository.findAllByTripIdOrderBySortOrderAscIdAsc(1L))
                .willReturn(List.of(food, other));

        categoryService.ensureDefaults(1L);

        then(initializationLockRepository).should().lockTrip(1L);
        then(categoryRepository).should().saveAll(
                org.mockito.ArgumentMatchers.<Iterable<PlaceCategory>>argThat(categories -> {
                    List<PlaceCategory> saved = java.util.stream.StreamSupport
                            .stream(categories.spliterator(), false)
                            .toList();
                    return saved.size() == 8
                            && saved.stream().noneMatch(category ->
                            category.getCategoryType() == PlaceCategoryType.FOOD)
                            && saved.stream().noneMatch(category ->
                            category.getCategoryType() == PlaceCategoryType.OTHER);
                })
        );
    }

    private PlaceCategory category(
            Long id,
            String name,
            PlaceCategoryType type,
            int sortOrder
    ) {
        PlaceCategory category = PlaceCategory.builder()
                .tripId(1L)
                .name(name)
                .categoryType(type)
                .markerColor("#123456")
                .markerIcon(PlaceMarkerIcon.MAP_PIN)
                .sortOrder(sortOrder)
                .build();
        ReflectionTestUtils.setField(category, "id", id);
        return category;
    }

    private List<PlaceCategory> completeCategories(PlaceCategory... replacements) {
        EnumMap<PlaceCategoryType, PlaceCategory> categories =
                new EnumMap<>(PlaceCategoryType.class);
        categories.put(PlaceCategoryType.FOOD, food);
        categories.put(PlaceCategoryType.CAFE, category(20L, "카페", PlaceCategoryType.CAFE, 1));
        categories.put(PlaceCategoryType.BAR, category(21L, "술집", PlaceCategoryType.BAR, 2));
        categories.put(
                PlaceCategoryType.ATTRACTION,
                category(22L, "명소", PlaceCategoryType.ATTRACTION, 3)
        );
        categories.put(PlaceCategoryType.NATURE, category(23L, "자연", PlaceCategoryType.NATURE, 4));
        categories.put(
                PlaceCategoryType.LODGING,
                category(24L, "숙소", PlaceCategoryType.LODGING, 5)
        );
        categories.put(
                PlaceCategoryType.SHOPPING,
                category(25L, "쇼핑", PlaceCategoryType.SHOPPING, 6)
        );
        categories.put(
                PlaceCategoryType.ACTIVITY,
                category(26L, "액티비티", PlaceCategoryType.ACTIVITY, 7)
        );
        categories.put(
                PlaceCategoryType.TRANSPORT,
                category(27L, "교통", PlaceCategoryType.TRANSPORT, 8)
        );
        categories.put(PlaceCategoryType.OTHER, other);
        for (PlaceCategory replacement : replacements) {
            categories.put(replacement.getCategoryType(), replacement);
        }
        return List.of(
                categories.get(PlaceCategoryType.FOOD),
                categories.get(PlaceCategoryType.CAFE),
                categories.get(PlaceCategoryType.BAR),
                categories.get(PlaceCategoryType.ATTRACTION),
                categories.get(PlaceCategoryType.NATURE),
                categories.get(PlaceCategoryType.LODGING),
                categories.get(PlaceCategoryType.SHOPPING),
                categories.get(PlaceCategoryType.ACTIVITY),
                categories.get(PlaceCategoryType.TRANSPORT),
                categories.get(PlaceCategoryType.OTHER)
        );
    }
}
