package back.backend.domain.place.service;

import static org.assertj.core.api.Assertions.assertThat;

import back.backend.domain.place.entity.PlaceCategoryType;
import java.util.List;
import java.util.stream.Stream;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

class PlaceCategoryClassifierTest {

    @Test
    @DisplayName("t1 Google 장소 유형을 정확한 여행 카테고리로 분류한다")
    void t1_classifiesOfficialGooglePlaceTypes() {
        assertThat(PlaceCategoryClassifier.classify("barbecue_restaurant", List.of(), null))
                .isEqualTo(PlaceCategoryType.FOOD);
        assertThat(PlaceCategoryClassifier.classify("castle", List.of(), null))
                .isEqualTo(PlaceCategoryType.ATTRACTION);
        assertThat(PlaceCategoryClassifier.classify("parking_lot", List.of(), null))
                .isEqualTo(PlaceCategoryType.TRANSPORT);
        assertThat(PlaceCategoryClassifier.classify("nature_preserve", List.of(), null))
                .isEqualTo(PlaceCategoryType.NATURE);
        assertThat(PlaceCategoryClassifier.classify("japanese_inn", List.of(), null))
                .isEqualTo(PlaceCategoryType.LODGING);
    }

    @Test
    @DisplayName("t2 대표 유형이 없으면 보조 유형으로 카테고리를 분류한다")
    void t2_usesSecondaryTypesWhenPrimaryTypeIsMissing() {
        PlaceCategoryType result = PlaceCategoryClassifier.classify(
                null,
                List.of("point_of_interest", "aquarium"),
                "오사카 가이유칸"
        );

        assertThat(result).isEqualTo(PlaceCategoryType.ACTIVITY);
    }

    @Test
    @DisplayName("t3 도시와 주소 유형은 여행 장소 검색 대상에서 제외한다")
    void t3_rejectsRegionAndAddressTypes() {
        assertThat(PlaceCategoryClassifier.isSearchable("locality", List.of("political")))
                .isFalse();
        assertThat(PlaceCategoryClassifier.isSearchable("street_address", List.of("premise")))
                .isFalse();
        assertThat(PlaceCategoryClassifier.isSearchable("restaurant", List.of("food")))
                .isTrue();
    }

    @Test
    @DisplayName("t4 대표 유형이 분류되면 장소 이름보다 우선한다")
    void t4_primaryTypeTakesPriorityOverName() {
        assertThat(PlaceCategoryClassifier.classify(null, List.of(), "바다 전망 펜션"))
                .isEqualTo(PlaceCategoryType.LODGING);
        assertThat(PlaceCategoryClassifier.classify("museum", List.of(), "박물관 카페"))
                .isEqualTo(PlaceCategoryType.ATTRACTION);
    }

    @Test
    @DisplayName("t5 여러 이름 키워드가 일치하면 명시된 카테고리 우선순위로 분류한다")
    void t5_usesExplicitPriorityForAmbiguousNameKeywords() {
        assertThat(PlaceCategoryClassifier.classify(null, List.of(), "카페 맛집"))
                .isEqualTo(PlaceCategoryType.FOOD);
    }

    @ParameterizedTest(name = "{index}: {2} -> {3}")
    @MethodSource("mixedCategoryCases")
    @DisplayName("t6 보조 유형 순서와 관계없이 이름 및 카테고리 우선순위로 분류한다")
    void t6_classifiesMixedSecondaryTypes(
            String primaryType,
            List<String> types,
            String placeName,
            PlaceCategoryType expected
    ) {
        assertThat(PlaceCategoryClassifier.classify(primaryType, types, placeName))
                .isEqualTo(expected);
    }

    @Test
    @DisplayName("t7 편의점 공식 유형과 이름을 편의점 카테고리로 분류한다")
    void t7_classifiesConvenienceStores() {
        assertThat(PlaceCategoryClassifier.classify(
                "convenience_store", List.of("store"), "7-Eleven"
        )).isEqualTo(PlaceCategoryType.CONVENIENCE);
        assertThat(PlaceCategoryClassifier.classify(
                null, List.of(), "GS25 편의점"
        )).isEqualTo(PlaceCategoryType.CONVENIENCE);
    }

    private static Stream<Arguments> mixedCategoryCases() {
        return Stream.of(
                arguments("establishment", List.of("cafe", "subway_station"),
                        "강남역", PlaceCategoryType.TRANSPORT),
                arguments("point_of_interest", List.of("museum", "parking_lot"),
                        "복합 주차장", PlaceCategoryType.TRANSPORT),
                arguments("establishment", List.of("hotel", "train_station"),
                        "KTX 역", PlaceCategoryType.TRANSPORT),
                arguments("establishment", List.of("cafe", "tourist_attraction"),
                        "경복궁", PlaceCategoryType.ATTRACTION),
                arguments("point_of_interest", List.of("restaurant", "historical_landmark"),
                        "남산타워", PlaceCategoryType.ATTRACTION),
                arguments("establishment", List.of("shopping_mall", "church"),
                        "명동성당", PlaceCategoryType.ATTRACTION),
                arguments("establishment", List.of("cafe", "restaurant"),
                        "이치란 라멘", PlaceCategoryType.FOOD),
                arguments("point_of_interest", List.of("transit_station", "restaurant"),
                        "역내 식당", PlaceCategoryType.FOOD),
                arguments("establishment", List.of("bar", "bakery"),
                        "파리 빵집", PlaceCategoryType.FOOD),
                arguments("establishment", List.of("cafe", "national_park"),
                        "한라산 국립공원", PlaceCategoryType.NATURE),
                arguments("point_of_interest", List.of("restaurant", "botanical_garden"),
                        "서울숲 정원", PlaceCategoryType.NATURE),
                arguments("establishment", List.of("hotel", "island"),
                        "비양도 섬", PlaceCategoryType.NATURE),
                arguments("establishment", List.of("cafe", "hotel"),
                        "그랜드 호텔", PlaceCategoryType.LODGING),
                arguments("point_of_interest", List.of("park", "campground"),
                        "캠핑장", PlaceCategoryType.LODGING),
                arguments("establishment", List.of("tourist_attraction", "cottage"),
                        "숲속 펜션", PlaceCategoryType.LODGING),
                arguments("establishment", List.of("cafe", "shopping_mall"),
                        "대형 쇼핑몰", PlaceCategoryType.SHOPPING),
                arguments("point_of_interest", List.of("restaurant", "department_store"),
                        "백화점", PlaceCategoryType.SHOPPING),
                arguments("establishment", List.of("transit_station", "flea_market"),
                        "벼룩시장", PlaceCategoryType.SHOPPING),
                arguments("establishment", List.of("cafe", "amusement_park"),
                        "롯데월드 놀이공원", PlaceCategoryType.ACTIVITY),
                arguments("point_of_interest", List.of("restaurant", "bowling_alley"),
                        "볼링장", PlaceCategoryType.ACTIVITY),
                arguments("establishment", List.of("park", "zoo"),
                        "서울 동물원", PlaceCategoryType.ACTIVITY),
                arguments("establishment", List.of("cafe", "bar"),
                        "루프탑 바", PlaceCategoryType.BAR),
                arguments("point_of_interest", List.of("transit_station", "wine_bar"),
                        "와인바", PlaceCategoryType.BAR),
                arguments("establishment", List.of("hotel", "brewery"),
                        "수제맥주 브루어리", PlaceCategoryType.BAR),
                arguments("establishment", List.of("bar", "cafe"),
                        "디저트 카페", PlaceCategoryType.CAFE),
                arguments("point_of_interest", List.of("bar", "tea_house"),
                        "전통 찻집 카페", PlaceCategoryType.CAFE),
                arguments("establishment", List.of("hotel", "cat_cafe"),
                        "고양이 카페", PlaceCategoryType.CAFE)
        );
    }

    private static Arguments arguments(
            String primaryType,
            List<String> types,
            String placeName,
            PlaceCategoryType expected
    ) {
        return Arguments.of(primaryType, types, placeName, expected);
    }
}
