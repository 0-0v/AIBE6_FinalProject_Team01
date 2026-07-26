package back.backend.domain.place.repository;

import static org.assertj.core.api.Assertions.assertThat;

import back.backend.domain.place.entity.PlaceCategory;
import back.backend.domain.place.entity.PlaceCategoryType;
import back.backend.domain.place.entity.PlaceMarkerIcon;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

@DataJpaTest
@ActiveProfiles("test")
@TestPropertySource(properties = "spring.jpa.hibernate.ddl-auto=create-drop")
class PlaceCategoryRepositoryTest {

    @Autowired PlaceCategoryRepository categoryRepository;

    @Test
    @DisplayName("t1 여행방 카테고리를 정렬 순서와 ID 순으로 조회한다")
    void t1_findAllReturnsCategoriesInDisplayOrder() {
        categoryRepository.saveAll(List.of(
                category(1L, "기타", PlaceCategoryType.OTHER, 2),
                category(1L, "음식점", PlaceCategoryType.FOOD, 0),
                category(1L, "카페", PlaceCategoryType.CAFE, 1),
                category(2L, "다른 방", PlaceCategoryType.CUSTOM, 0)
        ));

        List<PlaceCategory> result =
                categoryRepository.findAllByTripIdOrderBySortOrderAscIdAsc(1L);

        assertThat(result).extracting(PlaceCategory::getName)
                .containsExactly("음식점", "카페", "기타");
    }

    @Test
    @DisplayName("t2 여행방과 기본 유형이 모두 일치하는 카테고리를 조회한다")
    void t2_findByTripAndTypeDoesNotLeakOtherTripCategory() {
        categoryRepository.save(category(1L, "맛집", PlaceCategoryType.FOOD, 0));
        categoryRepository.save(category(2L, "다른 맛집", PlaceCategoryType.FOOD, 0));

        PlaceCategory result = categoryRepository
                .findFirstByTripIdAndCategoryType(2L, PlaceCategoryType.FOOD)
                .orElseThrow();

        assertThat(result.getName()).isEqualTo("다른 맛집");
    }

    private PlaceCategory category(
            Long tripId,
            String name,
            PlaceCategoryType type,
            int sortOrder
    ) {
        return PlaceCategory.builder()
                .tripId(tripId)
                .name(name)
                .categoryType(type)
                .markerColor("#64748b")
                .markerIcon(PlaceMarkerIcon.MAP_PIN)
                .sortOrder(sortOrder)
                .build();
    }
}
