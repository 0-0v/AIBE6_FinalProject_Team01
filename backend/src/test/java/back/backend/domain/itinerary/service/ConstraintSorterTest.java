package back.backend.domain.itinerary.service;

import back.backend.domain.place.entity.*;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class ConstraintSorterTest {

    private final OpeningHoursParser parser = new OpeningHoursParser();
    private final ConstraintSorter sorter = new ConstraintSorter(parser);

    private TripPlace mockPlace(Long id, PlaceCategoryType type, String openingHoursJson) {
        Place place = Place.builder()
                .googlePlaceId("g" + id)
                .name("장소" + id)
                .latitude(BigDecimal.valueOf(37.5))
                .longitude(BigDecimal.valueOf(127.0))
                .openingHoursJson(openingHoursJson)
                .build();

        PlaceCategory category = PlaceCategory.builder()
                .name(type.name())
                .categoryType(type)
                .markerColor("#FF0000")
                .markerIcon(PlaceMarkerIcon.MAP_PIN)
                .sortOrder(0)
                .tripId(1L)
                .build();

        TripPlace tp = Mockito.mock(TripPlace.class);
        Mockito.when(tp.getId()).thenReturn(id);
        Mockito.when(tp.getPlace()).thenReturn(place);
        Mockito.when(tp.getCategory()).thenReturn(category);
        return tp;
    }

    @Test
    @DisplayName("t1 BAR_장소는_항상_마지막에_배치된다")
    void t1_BAR_장소는_항상_마지막에_배치된다() {
        TripPlace bar  = mockPlace(1L, PlaceCategoryType.BAR, null);
        TripPlace food = mockPlace(2L, PlaceCategoryType.FOOD, null);

        List<TripPlace> sorted = sorter.sort(List.of(bar, food), LocalDate.of(2026, 8, 1));

        assertThat(sorted.get(sorted.size() - 1).getId()).isEqualTo(1L); // BAR는 마지막
        assertThat(sorted.get(0).getId()).isEqualTo(2L);                 // FOOD가 먼저
    }

    @Test
    @DisplayName("t2 FOOD_장소가_없으면_BAR만_있어도_정상_반환된다")
    void t2_FOOD_장소가_없으면_BAR만_있어도_정상_반환된다() {
        TripPlace bar = mockPlace(1L, PlaceCategoryType.BAR, null);
        List<TripPlace> sorted = sorter.sort(List.of(bar), LocalDate.of(2026, 8, 1));
        assertThat(sorted).hasSize(1);
        assertThat(sorted.get(0).getId()).isEqualTo(1L);
    }

    @Test
    @DisplayName("t3 영업시간이_18시_이후에_시작하는_장소는_야간_그룹으로_밀린다")
    void t3_영업시간이_18시_이후에_시작하는_장소는_야간_그룹으로_밀린다() {
        // 월요일(2026-08-03): 18:00~02:00만 여는 장소
        String nightJson = """
                {"periods":[{"open":{"day":1,"time":"1800"},"close":{"day":1,"time":"0200"}}]}
                """;
        // 09:00~21:00 여는 ATTRACTION
        String dayJson = """
                {"periods":[{"open":{"day":1,"time":"0900"},"close":{"day":1,"time":"2100"}}]}
                """;

        TripPlace nightPlace = mockPlace(1L, PlaceCategoryType.ATTRACTION, nightJson);
        TripPlace dayPlace   = mockPlace(2L, PlaceCategoryType.ATTRACTION, dayJson);

        List<TripPlace> sorted = sorter.sort(List.of(nightPlace, dayPlace), LocalDate.of(2026, 8, 3));

        assertThat(sorted.get(0).getId()).isEqualTo(2L);  // 낮 장소 먼저
        assertThat(sorted.get(1).getId()).isEqualTo(1L);  // 야간 장소 마지막
    }

    @Test
    @DisplayName("t4 opening_hours_json이_null인_장소는_제약없이_일반_그룹에_포함된다")
    void t4_opening_hours_json이_null인_장소는_제약없이_일반_그룹에_포함된다() {
        TripPlace attraction = mockPlace(1L, PlaceCategoryType.ATTRACTION, null);
        TripPlace cafe       = mockPlace(2L, PlaceCategoryType.CAFE, null);

        List<TripPlace> sorted = sorter.sort(List.of(attraction, cafe), LocalDate.of(2026, 8, 1));

        assertThat(sorted).containsExactlyInAnyOrder(attraction, cafe);
    }

    @Test
    @DisplayName("t5 빈_리스트는_빈_리스트를_반환한다")
    void t5_빈_리스트는_빈_리스트를_반환한다() {
        assertThat(sorter.sort(List.of(), LocalDate.now())).isEmpty();
    }

    @Test
    @DisplayName("t6 식사_3개와_관광_3곳이_있으면_관광_사이에_점심_저녁이_끼워진다")
    void t6_식사_3개와_관광_3곳이_있으면_관광_사이에_점심_저녁이_끼워진다() {
        TripPlace food1 = mockPlace(1L, PlaceCategoryType.FOOD, null);
        TripPlace food2 = mockPlace(2L, PlaceCategoryType.FOOD, null);
        TripPlace food3 = mockPlace(3L, PlaceCategoryType.FOOD, null);
        TripPlace attr1 = mockPlace(4L, PlaceCategoryType.ATTRACTION, null);
        TripPlace attr2 = mockPlace(5L, PlaceCategoryType.ATTRACTION, null);
        TripPlace attr3 = mockPlace(6L, PlaceCategoryType.ATTRACTION, null);

        // clusterByGeography 결과가 이미 정렬된 상태라고 가정
        List<TripPlace> sorted = sorter.sort(
                List.of(food1, food2, food3, attr1, attr2, attr3),
                LocalDate.of(2026, 8, 1)
        );

        assertThat(sorted).hasSize(6);

        // 점심(food1)이 관광 사이에 끼여야 함 — 첫 번째 FOOD가 맨 앞이면 안 됨
        assertThat(sorted.get(0).getId()).isNotIn(1L, 2L, 3L); // 첫 장소는 관광

        // 마지막 장소는 nightGroup이 아니니 초과 식사(food3)
        long lastId = sorted.get(sorted.size() - 1).getId();
        assertThat(lastId).isIn(1L, 2L, 3L, 4L, 5L, 6L); // 유효한 ID

        // 연속으로 FOOD가 두 번 나오지 않는지 확인
        for (int i = 0; i < sorted.size() - 1; i++) {
            boolean curIsMeal  = isMeal(sorted.get(i));
            boolean nextIsMeal = isMeal(sorted.get(i + 1));
            assertThat(curIsMeal && nextIsMeal)
                    .as("인덱스 %d와 %d가 연속 식사", i, i + 1)
                    .isFalse();
        }
    }

    @Test
    @DisplayName("t7 일반_장소가_없고_식사만_있으면_점심_저녁_순서로_나열된다")
    void t7_일반_장소가_없고_식사만_있으면_점심_저녁_순서로_나열된다() {
        TripPlace food1 = mockPlace(1L, PlaceCategoryType.FOOD, null);
        TripPlace food2 = mockPlace(2L, PlaceCategoryType.FOOD, null);

        List<TripPlace> sorted = sorter.sort(List.of(food1, food2), LocalDate.of(2026, 8, 1));

        assertThat(sorted).hasSize(2);
        assertThat(sorted.get(0).getId()).isEqualTo(1L);
        assertThat(sorted.get(1).getId()).isEqualTo(2L);
    }

    @Test
    @DisplayName("t8 같은_카테고리_관광지가_연속되면_사이에_다른_카테고리가_끼워진다")
    void t8_같은_카테고리_관광지가_연속되면_사이에_다른_카테고리가_끼워진다() {
        TripPlace attr1    = mockPlace(1L, PlaceCategoryType.ATTRACTION, null);
        TripPlace attr2    = mockPlace(2L, PlaceCategoryType.ATTRACTION, null);
        TripPlace shopping = mockPlace(3L, PlaceCategoryType.SHOPPING, null);

        List<TripPlace> sorted = sorter.sort(
                List.of(attr1, attr2, shopping),
                LocalDate.of(2026, 8, 1)
        );

        assertThat(sorted).hasSize(3);
        // attr1 → attr2 연속이 아니어야 함
        boolean consecutive = sorted.get(0).getId() == 1L && sorted.get(1).getId() == 2L;
        assertThat(consecutive).isFalse();
    }

    @Test
    @DisplayName("t9 date가_null이면_원본_순서를_그대로_반환한다")
    void t9_date가_null이면_원본_순서를_그대로_반환한다() {
        TripPlace food = mockPlace(1L, PlaceCategoryType.FOOD, null);
        TripPlace bar  = mockPlace(2L, PlaceCategoryType.BAR, null);

        List<TripPlace> sorted = sorter.sort(List.of(food, bar), null);

        assertThat(sorted).hasSize(2);
        assertThat(sorted.get(0).getId()).isEqualTo(1L);
        assertThat(sorted.get(1).getId()).isEqualTo(2L);
    }

    private boolean isMeal(TripPlace place) {
        PlaceCategoryType type = place.getCategory().getCategoryType();
        return type == PlaceCategoryType.FOOD || type == PlaceCategoryType.CAFE;
    }
}
