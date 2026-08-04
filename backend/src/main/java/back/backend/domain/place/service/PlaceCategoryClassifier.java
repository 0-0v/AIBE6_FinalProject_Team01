package back.backend.domain.place.service;

import back.backend.domain.place.entity.PlaceCategoryType;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

final class PlaceCategoryClassifier {

    private static final Set<String> EXCLUDED_SEARCH_TYPES = Set.of(
            "administrative_area_level_1",
            "administrative_area_level_2",
            "administrative_area_level_3",
            "administrative_area_level_4",
            "administrative_area_level_5",
            "administrative_area_level_6",
            "administrative_area_level_7",
            "archipelago",
            "colloquial_area",
            "continent",
            "country",
            "geocode",
            "intersection",
            "locality",
            "neighborhood",
            "plus_code",
            "political",
            "postal_code",
            "postal_code_prefix",
            "postal_code_suffix",
            "postal_town",
            "premise",
            "route",
            "street_address",
            "sublocality",
            "sublocality_level_1",
            "sublocality_level_2",
            "sublocality_level_3",
            "sublocality_level_4",
            "sublocality_level_5",
            "subpremise"
    );

    private static final Map<String, PlaceCategoryType> TYPE_MAPPINGS = createTypeMappings();

    // primaryType이 매핑 안 될 때 types 배열에 여러 카테고리가 섞인 경우 우선순위
    private static final List<PlaceCategoryType> CATEGORY_PRIORITY = List.of(
            PlaceCategoryType.TRANSPORT,
            PlaceCategoryType.LODGING,
            PlaceCategoryType.ATTRACTION,
            PlaceCategoryType.NATURE,
            PlaceCategoryType.ACTIVITY,
            PlaceCategoryType.FOOD,
            PlaceCategoryType.CONVENIENCE,
            PlaceCategoryType.SHOPPING,
            PlaceCategoryType.BAR,
            PlaceCategoryType.CAFE
    );

    private static Map<String, PlaceCategoryType> createTypeMappings() {
        Map<String, PlaceCategoryType> mappings = new HashMap<>();
        register(mappings, PlaceCategoryType.CAFE,
                    "cafe", "cafeteria", "cat_cafe", "coffee_shop", "internet_cafe", "tea_house");
        register(mappings, PlaceCategoryType.BAR,
                    "bar", "bar_and_grill", "beer_garden", "brewery", "brewpub",
                    "night_club", "pub", "sports_bar", "wine_bar", "winery", "vineyard");
        register(mappings, PlaceCategoryType.FOOD,
                    "bakery", "bagel_shop", "cake_shop", "candy_store", "food",
                    "meal_delivery", "meal_takeaway", "pastry_shop", "restaurant",
                    "sandwich_shop", "snack_bar");
        register(mappings, PlaceCategoryType.LODGING,
                    "bed_and_breakfast", "budget_japanese_inn", "campground",
                    "camping_cabin", "cottage", "extended_stay_hotel", "farmstay",
                    "guest_house", "hostel", "hotel", "inn", "japanese_inn",
                    "lodging", "mobile_home_park", "motel", "private_guest_room",
                    "resort_hotel", "rv_park");
        register(mappings, PlaceCategoryType.TRANSPORT,
                    "airport", "airstrip", "bike_sharing_station", "bus_station",
                    "bus_stop", "car_rental", "ferry_service", "ferry_terminal",
                    "heliport", "international_airport", "light_rail_station",
                    "park_and_ride", "parking", "parking_garage", "parking_lot",
                    "subway_station", "taxi_service", "taxi_stand", "train_station",
                    "train_ticket_office", "tram_stop", "transit_depot",
                    "transit_station", "transit_stop", "transportation_service");
        register(mappings, PlaceCategoryType.ACTIVITY,
                    "adventure_sports_center", "amusement_center", "amusement_park",
                    "aquarium", "arena", "athletic_field", "bowling_alley", "casino",
                    "cycling_park", "ferris_wheel", "fitness_center", "go_karting_venue",
                    "golf_course", "gym", "hiking_area", "ice_skating_rink",
                    "indoor_playground", "karaoke", "miniature_golf_course",
                    "movie_theater", "off_roading_area", "paintball_center",
                    "playground", "race_course", "roller_coaster", "skateboard_park",
                    "ski_resort", "spa", "sports_activity_location", "sports_club",
                    "sports_complex", "stadium", "swimming_pool", "tennis_court",
                    "video_arcade", "water_park", "wildlife_park", "zoo");
        register(mappings, PlaceCategoryType.NATURE,
                    "beach", "botanical_garden", "city_park", "garden", "island",
                    "lake", "mountain_peak", "national_park", "natural_feature",
                    "nature_preserve", "park", "river", "scenic_spot", "state_park",
                    "wildlife_refuge", "woods");
        register(mappings, PlaceCategoryType.SHOPPING,
                    "department_store", "discount_store", "flea_market", "gift_shop",
                    "grocery_store", "hypermarket", "market", "shopping_mall",
                    "store", "supermarket", "warehouse_store");
        register(mappings, PlaceCategoryType.CONVENIENCE,
                    "convenience_store");
        register(mappings, PlaceCategoryType.ATTRACTION,
                    "amphitheatre", "art_gallery", "art_museum", "auditorium",
                    "castle", "church", "cultural_landmark", "fountain",
                    "historical_landmark", "historical_place", "history_museum",
                    "hindu_temple", "monument", "mosque", "museum",
                    "observation_deck", "performing_arts_theater", "planetarium",
                    "sculpture", "shinto_shrine", "synagogue", "tourist_attraction",
                    "visitor_center");
        return Map.copyOf(mappings);
    }

    private static final Map<PlaceCategoryType, List<String>> NAME_KEYWORDS = Map.of(
            PlaceCategoryType.CAFE, List.of("카페", "커피", "로스터리"),
            PlaceCategoryType.BAR, List.of("술집", "주점", "펍", "호프", "와인바", "브루어리", " 바"),
            PlaceCategoryType.FOOD, List.of("맛집", "식당", "라멘", "라면", "국수", "빵집"),
            PlaceCategoryType.LODGING, List.of(
                    "호텔", "숙소", "숙박", "리조트", "료칸", "에어비앤비",
                    "airbnb", "펜션", "풀빌라", "민박", "모텔", "호스텔",
                    "게스트하우스", "콘도", "레지던스", "캠핑장", "글램핑"
            ),
            PlaceCategoryType.TRANSPORT, List.of(
                    "공항", "기차역", "철도역", "버스터미널", "지하철역", "여객터미널", "주차장"
            ),
            PlaceCategoryType.ACTIVITY, List.of(
                    "유니버설 스튜디오", "테마파크", "놀이공원", "워터파크",
                    "아쿠아리움", "수족관", "동물원", "볼링장", "스키장", "골프장"
            ),
            PlaceCategoryType.NATURE, List.of(
                    "공원", "정원", "해변", "해수욕장", "등산", "산악", "산 정상", "섬"
            ),
            PlaceCategoryType.SHOPPING, List.of("쇼핑", "시장", "백화점", "아울렛", "쇼핑몰"),
            PlaceCategoryType.CONVENIENCE, List.of("편의점"),
            PlaceCategoryType.ATTRACTION, List.of(
                    "박물관", "미술관", "명소", "성당", "사찰", "궁궐", "성곽"
            )
    );

    private PlaceCategoryClassifier() {
    }

    static PlaceCategoryType classify(String primaryType, List<String> types, String placeName) {
        PlaceCategoryType primaryCategory = classifyType(primaryType);
        if (primaryCategory != null) {
            return primaryCategory;
        }

        // types 배열에서 매핑 가능한 카테고리를 모두 수집 (삽입 순서 유지)
        Set<PlaceCategoryType> candidates = new LinkedHashSet<>();
        if (types != null) {
            for (String type : types) {
                PlaceCategoryType category = classifyType(type);
                if (category != null) {
                    candidates.add(category);
                }
            }
        }

        if (candidates.isEmpty()) {
            return classifyName(placeName);
        }

        // 후보가 하나면 그대로 반환
        if (candidates.size() == 1) {
            return candidates.iterator().next();
        }

        // 여러 카테고리가 섞인 경우: 이름 키워드로 먼저 판단
        PlaceCategoryType nameCategory = classifyName(placeName);
        if (candidates.contains(nameCategory)) {
            return nameCategory;
        }

        // 이름으로도 판단 불가 시 카테고리 우선순위로 결정
        return CATEGORY_PRIORITY.stream()
                .filter(candidates::contains)
                .findFirst()
                .orElse(PlaceCategoryType.OTHER);
    }

    static boolean isSearchable(String primaryType, List<String> types) {
        String normalizedPrimaryType = normalize(primaryType);
        if (EXCLUDED_SEARCH_TYPES.contains(normalizedPrimaryType)) {
            return false;
        }
        if (!normalizedPrimaryType.isEmpty()) {
            return true;
        }
        if (types == null || types.isEmpty()) {
            return true;
        }
        return types.stream()
                .map(PlaceCategoryClassifier::normalize)
                .noneMatch(EXCLUDED_SEARCH_TYPES::contains);
    }

    private static PlaceCategoryType classifyType(String type) {
        String normalizedType = normalize(type);
        PlaceCategoryType mapped = TYPE_MAPPINGS.get(normalizedType);
        if (mapped != null) {
            return mapped;
        }
        if (normalizedType.endsWith("_restaurant")) {
            return PlaceCategoryType.FOOD;
        }
        if (normalizedType.endsWith("_store")) {
            return PlaceCategoryType.SHOPPING;
        }
        return null;
    }

    private static PlaceCategoryType classifyName(String placeName) {
        String normalizedName = normalize(placeName);
        if (normalizedName.isEmpty()) {
            return PlaceCategoryType.OTHER;
        }
        return CATEGORY_PRIORITY.stream()
                .filter(category -> NAME_KEYWORDS.getOrDefault(category, List.of()).stream()
                        .anyMatch(normalizedName::contains))
                .findFirst()
                .orElse(PlaceCategoryType.OTHER);
    }

    private static String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private static void register(
            Map<String, PlaceCategoryType> mappings,
            PlaceCategoryType category,
            String... types
    ) {
        for (String type : types) {
            mappings.put(type, category);
        }
    }
}
