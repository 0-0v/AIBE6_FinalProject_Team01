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
    @DisplayName("t1 BAR_장소는_FOOD_장소보다_뒤에_배치된다")
    void t1_BAR_장소는_FOOD_장소보다_뒤에_배치된다() {
        TripPlace bar  = mockPlace(1L, PlaceCategoryType.BAR, null);
        TripPlace food = mockPlace(2L, PlaceCategoryType.FOOD, null);

        List<TripPlace> sorted = sorter.sort(List.of(bar, food), LocalDate.of(2026, 8, 1));

        assertThat(sorted.get(0).getId()).isEqualTo(2L);
        assertThat(sorted.get(1).getId()).isEqualTo(1L);
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
    @DisplayName("t3 영업시간_범위를_벗어난_장소는_뒤로_밀린다")
    void t3_영업시간_범위를_벗어난_장소는_뒤로_밀린다() {
        // 월요일(2026-08-03): 18:00~02:00만 여는 BAR
        String nightJson = """
                {"periods":[{"open":{"day":1,"time":"1800"},"close":{"day":1,"time":"0200"}}]}
                """;
        // 09:00~21:00 여는 ATTRACTION
        String dayJson = """
                {"periods":[{"open":{"day":1,"time":"0900"},"close":{"day":1,"time":"2100"}}]}
                """;

        TripPlace bar        = mockPlace(1L, PlaceCategoryType.BAR, nightJson);
        TripPlace attraction = mockPlace(2L, PlaceCategoryType.ATTRACTION, dayJson);

        List<TripPlace> sorted = sorter.sort(List.of(bar, attraction), LocalDate.of(2026, 8, 3));

        assertThat(sorted.get(0).getId()).isEqualTo(2L);
        assertThat(sorted.get(1).getId()).isEqualTo(1L);
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
}
