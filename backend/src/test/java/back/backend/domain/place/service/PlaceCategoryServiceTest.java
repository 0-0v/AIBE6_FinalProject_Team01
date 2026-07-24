package back.backend.domain.place.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.lenient;

import back.backend.domain.collaboration.service.CollaborationEventService;
import back.backend.domain.place.dto.request.CreatePlaceCategoryRequest;
import back.backend.domain.place.dto.request.ReorderPlaceCategoriesRequest;
import back.backend.domain.place.dto.response.PlaceCategoryResponse;
import back.backend.domain.place.entity.PlaceCategory;
import back.backend.domain.place.entity.PlaceCategoryType;
import back.backend.domain.place.entity.TripPlace;
import back.backend.domain.place.exception.PlaceErrorCode;
import back.backend.domain.place.repository.PlaceCategoryRepository;
import back.backend.domain.place.repository.TripPlaceRepository;
import back.backend.global.exception.BusinessException;
import java.util.List;
import java.util.Optional;
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
    @Mock TripPlaceRepository tripPlaceRepository;
    @Mock TripAccessChecker accessChecker;
    @Mock CollaborationEventService collaborationEventService;
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
        given(categoryRepository.countByTripId(1L)).willReturn(2L);
        given(categoryRepository.findAllByTripIdOrderBySortOrderAscIdAsc(1L))
                .willReturn(List.of(food, other));

        List<PlaceCategoryResponse> result = categoryService.getCategories(1L);

        assertThat(result).extracting(PlaceCategoryResponse::name)
                .containsExactly("음식점", "기타");
    }

    @Test
    @DisplayName("t2 사용자 카테고리를 생성하면 마지막 정렬 순서로 저장한다")
    void t2_createCustomCategoryUsesLastSortOrder() {
        given(accessChecker.requireEdit(1L)).willReturn(10L);
        given(categoryRepository.countByTripId(1L)).willReturn(2L);
        given(categoryRepository.findAllByTripIdOrderBySortOrderAscIdAsc(1L))
                .willReturn(List.of(food, other));
        given(categoryRepository.save(any(PlaceCategory.class))).willAnswer(invocation -> {
            PlaceCategory saved = invocation.getArgument(0);
            ReflectionTestUtils.setField(saved, "id", 3L);
            return saved;
        });

        PlaceCategoryResponse result = categoryService.create(
                1L,
                new CreatePlaceCategoryRequest("야경", "#112233", "🌃")
        );

        assertThat(result.categoryType()).isEqualTo(PlaceCategoryType.CUSTOM);
        assertThat(result.sortOrder()).isEqualTo(2);
    }

    @Test
    @DisplayName("t3 Google 장소 유형에 맞는 기본 카테고리를 추천한다")
    void t3_recommendCategoryUsesGooglePlaceType() {
        given(categoryRepository.countByTripId(1L)).willReturn(2L);
        given(categoryRepository.findFirstByTripIdAndCategoryType(1L, PlaceCategoryType.FOOD))
                .willReturn(Optional.of(food));

        PlaceCategory result = categoryService.recommend(
                1L,
                "벳푸 라멘",
                "ramen_restaurant"
        );

        assertThat(result).isEqualTo(food);
    }

    @Test
    @DisplayName("t4 카테고리 삭제 시 연결된 장소를 기타 카테고리로 이동한다")
    void t4_deleteCategoryMovesPlacesToOther() {
        given(accessChecker.requireEdit(1L)).willReturn(10L);
        TripPlace tripPlace = TripPlace.builder().tripId(1L).category(food).build();
        given(categoryRepository.findByIdAndTripId(1L, 1L)).willReturn(Optional.of(food));
        given(categoryRepository.findFirstByTripIdAndCategoryType(1L, PlaceCategoryType.OTHER))
                .willReturn(Optional.of(other));
        given(tripPlaceRepository.findAllByTripIdAndCategory(1L, food))
                .willReturn(List.of(tripPlace));

        categoryService.delete(1L, 1L);

        assertThat(tripPlace.getCategory()).isEqualTo(other);
        then(categoryRepository).should().delete(food);
    }

    @Test
    @DisplayName("t5 기타 카테고리는 삭제할 수 없다")
    void t5_otherCategoryCannotBeDeleted() {
        given(accessChecker.requireEdit(1L)).willReturn(10L);
        given(categoryRepository.findByIdAndTripId(2L, 1L)).willReturn(Optional.of(other));

        assertThatThrownBy(() -> categoryService.delete(1L, 2L))
                .isInstanceOf(BusinessException.class)
                .extracting(error -> ((BusinessException) error).getErrorCode())
                .isEqualTo(PlaceErrorCode.PLACE_CATEGORY_REQUIRED);
    }

    @Test
    @DisplayName("t6 전체 카테고리 ID가 아니면 정렬 순서 변경을 거부한다")
    void t6_reorderRequiresEveryCategoryId() {
        given(accessChecker.requireEdit(1L)).willReturn(10L);
        given(categoryRepository.findAllByTripIdOrderBySortOrderAscIdAsc(1L))
                .willReturn(List.of(food, other));

        assertThatThrownBy(() -> categoryService.reorder(
                1L,
                new ReorderPlaceCategoriesRequest(List.of(1L))
        ))
                .isInstanceOf(BusinessException.class)
                .extracting(error -> ((BusinessException) error).getErrorCode())
                .isEqualTo(PlaceErrorCode.PLACE_CATEGORY_ORDER_INVALID);
    }

    @Test
    @DisplayName("t7 다양한 숙박 명칭과 Google 장소 유형을 숙소로 추천한다")
    void t7_recommendCategoryRecognizesLodgingVariants() {
        PlaceCategory lodging = category(3L, "숙소", PlaceCategoryType.LODGING, 2);
        given(categoryRepository.countByTripId(1L)).willReturn(2L);
        given(categoryRepository.findFirstByTripIdAndCategoryType(1L, PlaceCategoryType.LODGING))
                .willReturn(Optional.of(lodging));

        List<PlaceCategory> results = List.of(
                categoryService.recommend(1L, "제주 에어비앤비", null),
                categoryService.recommend(1L, "바다 전망 펜션", null),
                categoryService.recommend(1L, "성산 게스트하우스", "guest_house"),
                categoryService.recommend(1L, "숲속 글램핑", "campground"),
                categoryService.recommend(1L, "도심형 숙박시설", "extended_stay_hotel")
        );

        assertThat(results).containsOnly(lodging);
    }

    @Test
    @DisplayName("t7 카테고리가 없는 여행방은 기본 카테고리를 자동 생성한다")
    void t7_emptyTripCreatesDefaultCategories() {
        given(categoryRepository.countByTripId(1L)).willReturn(0L);

        categoryService.ensureDefaults(1L);

        then(categoryRepository).should().saveAll(
                org.mockito.ArgumentMatchers.argThat(categories -> {
                    List<PlaceCategory> saved = java.util.stream.StreamSupport
                            .stream(categories.spliterator(), false)
                            .toList();
                    return saved.size() == 7
                            && saved.get(0).getCategoryType() == PlaceCategoryType.FOOD
                            && saved.get(6).getCategoryType() == PlaceCategoryType.OTHER;
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
                .markerIcon("📍")
                .sortOrder(sortOrder)
                .build();
        ReflectionTestUtils.setField(category, "id", id);
        return category;
    }
}
