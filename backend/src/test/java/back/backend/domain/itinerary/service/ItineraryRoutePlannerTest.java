package back.backend.domain.itinerary.service;

import back.backend.domain.itinerary.dto.response.RoutePlanPreviewResponse;
import back.backend.domain.itinerary.entity.ItineraryDay;
import back.backend.domain.place.entity.Place;
import back.backend.domain.place.entity.PlaceCategory;
import back.backend.domain.place.entity.PlaceCategoryType;
import back.backend.domain.place.entity.PlaceMarkerIcon;
import back.backend.domain.place.entity.TripPlace;
import back.backend.domain.place.entity.TripPlaceStatus;
import back.backend.domain.trip.entity.TravelStyle;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.nullable;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ItineraryRoutePlannerTest {

    @Mock
    private GoogleRoutesClient routesClient;

    @Mock
    private OpenAiRouteAdvisor openAiRouteAdvisor;

    @Mock
    private ConstraintSorter constraintSorter;

    private ItineraryRoutePlanner planner;

    @BeforeEach
    void setUp() {
        // Routes API 미설정 → Haversine 폴백 (일부 테스트에서 미호출 허용)
        lenient().when(routesClient.getRouteInfo(
                anyDouble(),
                anyDouble(),
                anyDouble(),
                anyDouble(),
                anyString(),
                nullable(String.class),
                nullable(java.time.Instant.class)
        ))
                .thenReturn(Optional.empty());
        // ConstraintSorter: 입력 리스트를 그대로 반환 (정렬 없이 통과)
        lenient().when(constraintSorter.sort(org.mockito.ArgumentMatchers.anyList(), org.mockito.ArgumentMatchers.any()))
                .thenAnswer(inv -> inv.getArgument(0));

        planner = new ItineraryRoutePlanner(
                routesClient,
                openAiRouteAdvisor,
                constraintSorter
        );
    }

    @Test
    @DisplayName("t1 저장 장소를 여행 Day에 균등하게 분배한다")
    void t1_planDistributesSavedPlacesAcrossDays() {
        List<ItineraryDay> days = List.of(day(1L, 1), day(2L, 2));
        List<TripPlace> places = List.of(
                tripPlace(10L, "A", PlaceCategoryType.ATTRACTION, 33.4500, 126.5000),
                tripPlace(11L, "B", PlaceCategoryType.ATTRACTION, 33.4510, 126.5010),
                tripPlace(12L, "C", PlaceCategoryType.ATTRACTION, 33.5000, 126.5500),
                tripPlace(13L, "D", PlaceCategoryType.ATTRACTION, 33.5010, 126.5510)
        );

        RoutePlanPreviewResponse result = planner.plan(days, places);

        assertThat(result.days()).hasSize(2);
        assertThat(result.days()).extracting(day -> day.items().size())
                .containsExactly(2, 2);
        assertThat(result.totalPlaceCount()).isEqualTo(4);
    }

    @Test
    @DisplayName("t2 가까운 장소를 연속 배치하고 한 시간 반 체류 시간을 부여한다")
    void t2_planOrdersNearbyPlacesAndAssignsTimes() {
        List<TripPlace> places = List.of(
                tripPlace(10L, "출발", PlaceCategoryType.ATTRACTION, 33.4500, 126.5000),
                tripPlace(11L, "가까움", PlaceCategoryType.ATTRACTION, 33.4510, 126.5010),
                tripPlace(12L, "멀리", PlaceCategoryType.ATTRACTION, 33.6000, 126.7000)
        );

        RoutePlanPreviewResponse result = planner.plan(
                List.of(day(1L, 1)),
                places
        );

        assertThat(result.days().getFirst().items())
                .extracting(item -> item.placeName())
                .containsExactly("출발", "가까움", "멀리");
        assertThat(result.days().getFirst().items().getFirst().startTime())
                .isEqualTo("09:00");
        assertThat(result.days().getFirst().items().getFirst().endTime())
                .isEqualTo("10:30");
        assertThat(result.days().getFirst().items().getFirst().transportMinutes())
                .isPositive();
    }

    @Test
    @DisplayName("t3 FOOD 스타일은 음식점·카페 장소를 동선 앞쪽에 배치한다")
    void t3_foodStylePrioritizesFoodAndCafePlaces() {
        List<TripPlace> places = List.of(
                tripPlace(10L, "명소A", PlaceCategoryType.ATTRACTION, 33.4500, 126.5000),
                tripPlace(11L, "음식점B", PlaceCategoryType.FOOD, 33.4600, 126.5100),
                tripPlace(12L, "카페C", PlaceCategoryType.CAFE, 33.4700, 126.5200),
                tripPlace(13L, "명소D", PlaceCategoryType.ATTRACTION, 33.4800, 126.5300)
        );

        var options = planner.planMulti(
                List.of(day(1L, 1), day(2L, 2)),
                places,
                Set.of(TravelStyle.FOOD)
        );

        var foodOption = options.stream()
                .filter(option -> option.routeLabel().startsWith("맛집"))
                .findFirst()
                .orElseThrow();
        List<String> firstDayCategories = foodOption.plan().days()
                .getFirst()
                .items()
                .stream()
                .map(item -> item.categoryName())
                .toList();

        assertThat(firstDayCategories)
                .contains("음식점", "카페");
    }

    @Test
    @DisplayName("t4 중복되지 않는 여행 스타일 N개 입력 시 지리 우선 코스 포함 N+1개의 옵션을 반환한다")
    void t4_multiStyleProducesGeoFirstPlusStyleOptions() {
        List<ItineraryDay> days = List.of(day(1L, 1), day(2L, 2));
        List<TripPlace> places = List.of(
                tripPlace(10L, "음식점", PlaceCategoryType.FOOD, 33.4500, 126.5000),
                tripPlace(11L, "카페", PlaceCategoryType.CAFE, 33.4510, 126.5010),
                tripPlace(12L, "명소", PlaceCategoryType.ATTRACTION, 33.5000, 126.5500),
                tripPlace(13L, "자연", PlaceCategoryType.NATURE, 33.5010, 126.5510)
        );
        Set<TravelStyle> styles = Set.of(TravelStyle.FOOD, TravelStyle.NATURE);

        var options = planner.planMulti(days, places, styles);

        // 이 픽스처에서는 경로가 중복되지 않으므로 지리 우선 1개 + 스타일 2개 = 3개
        assertThat(options).hasSize(3);
        assertThat(options.get(0).routeLabel()).isEqualTo("지리 최적 코스");
        assertThat(options).extracting(opt -> opt.routeLabel())
                .allMatch(label -> label.endsWith("코스"));
        assertThat(options).extracting(opt -> opt.routeLabel())
                .noneMatch(label -> label.contains("중심 중심"));
    }

    @Test
    @DisplayName("t5 스타일 없으면 지리 우선 코스 1개만 반환한다")
    void t5_noStyleProducesOnlyGeoFirstOption() {
        List<ItineraryDay> days = List.of(day(1L, 1), day(2L, 2));
        List<TripPlace> places = List.of(
                tripPlace(10L, "A", PlaceCategoryType.ATTRACTION, 33.45, 126.50),
                tripPlace(11L, "B", PlaceCategoryType.ATTRACTION, 33.46, 126.51)
        );

        var options = planner.planMulti(days, places, Set.of());

        assertThat(options).hasSize(1);
        assertThat(options.get(0).routeLabel()).isEqualTo("지리 최적 코스");
    }

    @Test
    @DisplayName("t6 스타일 우선 코스는 지리 우선 코스와 다른 Day 배분을 가진다")
    void t6_styleFirstCourseDiffersFromGeoFirst() {
        List<ItineraryDay> days = List.of(day(1L, 1), day(2L, 2));
        // 음식점 4개(지리 분산) + 명소 2개 섞임
        List<TripPlace> places = List.of(
                tripPlace(10L, "음식점북1", PlaceCategoryType.FOOD,       33.40, 126.50),
                tripPlace(11L, "명소북",   PlaceCategoryType.ATTRACTION,  33.41, 126.51),
                tripPlace(12L, "음식점북2", PlaceCategoryType.FOOD,       33.42, 126.52),
                tripPlace(13L, "음식점남1", PlaceCategoryType.FOOD,       33.60, 126.60),
                tripPlace(14L, "명소남",   PlaceCategoryType.ATTRACTION,  33.61, 126.61),
                tripPlace(15L, "음식점남2", PlaceCategoryType.FOOD,       33.62, 126.62)
        );
        Set<TravelStyle> styles = Set.of(TravelStyle.FOOD);

        var options = planner.planMulti(days, places, styles);
        assertThat(options).hasSize(2);

        var geoDay1 = options.get(0).plan().days().get(0).items().stream()
                .map(i -> i.placeName()).toList();
        var styleDay1 = options.get(1).plan().days().get(0).items().stream()
                .map(i -> i.placeName()).toList();

        // 두 옵션의 Day1 구성이 달라야 한다
        assertThat(geoDay1).isNotEqualTo(styleDay1);
    }

    // ── 픽스처 ──────────────────────────────────────────────────────────────

    private ItineraryDay day(Long id, int number) {
        ItineraryDay day = ItineraryDay.create(
                1L,
                LocalDate.of(2026, 8, number),
                number
        );
        ReflectionTestUtils.setField(day, "id", id);
        return day;
    }

    private TripPlace tripPlace(Long id, String name, PlaceCategoryType categoryType,
                                double lat, double lng) {
        Place place = Place.builder()
                .googlePlaceId("google-" + id)
                .name(name)
                .address("테스트 주소")
                .latitude(BigDecimal.valueOf(lat))
                .longitude(BigDecimal.valueOf(lng))
                .build();
        PlaceCategory category = PlaceCategory.builder()
                .name(categoryKorean(categoryType))
                .tripId(1L)
                .categoryType(categoryType)
                .markerColor("#f97316")
                .markerIcon(PlaceMarkerIcon.LANDMARK)
                .build();
        TripPlace tripPlace = TripPlace.builder()
                .tripId(1L)
                .place(place)
                .category(category)
                .addedBy(1L)
                .status(TripPlaceStatus.SAVED)
                .build();
        ReflectionTestUtils.setField(tripPlace, "id", id);
        return tripPlace;
    }

    private String categoryKorean(PlaceCategoryType type) {
        return switch (type) {
            case FOOD -> "음식점";
            case CAFE -> "카페";
            case ATTRACTION -> "명소";
            case NATURE -> "자연";
            default -> type.name();
        };
    }

    private int timeToMinutes(String time) {
        String[] parts = time.split(":");
        return Integer.parseInt(parts[0]) * 60 + Integer.parseInt(parts[1]);
    }

    @Test
    @DisplayName("t7 지리적으로 가까운 장소들이 같은 Day에 배정된다")
    void t7_clusterByGeographyGroupsNearbyPlaces() {
        // 북쪽 2개 (33.45 근처), 남쪽 2개 (33.55 근처)
        List<TripPlace> places = List.of(
                tripPlace(10L, "북1", PlaceCategoryType.ATTRACTION, 33.4500, 126.5000),
                tripPlace(11L, "북2", PlaceCategoryType.ATTRACTION, 33.4510, 126.5010),
                tripPlace(12L, "남1", PlaceCategoryType.ATTRACTION, 33.5500, 126.5500),
                tripPlace(13L, "남2", PlaceCategoryType.ATTRACTION, 33.5510, 126.5510)
        );

        RoutePlanPreviewResponse result = planner.plan(List.of(day(1L, 1), day(2L, 2)), places);

        var day1Names = result.days().get(0).items().stream().map(i -> i.placeName()).toList();
        var day2Names = result.days().get(1).items().stream().map(i -> i.placeName()).toList();

        boolean northSameDay = day1Names.containsAll(List.of("북1", "북2"))
                || day2Names.containsAll(List.of("북1", "북2"));
        assertThat(northSameDay).isTrue();
    }

    @Test
    @DisplayName("t8 클러스터링 결과가 극단적 불균형(8+1+1)을 방지한다")
    void t8_clusterByGeographyRespectsSoftCap() {
        // 10개 장소, 3일 — soft cap = ceil(10/3 * 1.5) = 5
        List<TripPlace> places = new java.util.ArrayList<>();
        for (int i = 0; i < 10; i++) {
            places.add(tripPlace((long) (10 + i), "장소" + i,
                    PlaceCategoryType.ATTRACTION,
                    33.45 + i * 0.001, 126.50 + i * 0.001));
        }

        RoutePlanPreviewResponse result = planner.plan(
                List.of(day(1L, 1), day(2L, 2), day(3L, 3)), places);

        result.days().forEach(d ->
                assertThat(d.items().size()).isLessThanOrEqualTo(5));
    }

    @Test
    @DisplayName("t9 Day 수가 장소 수보다 많으면 빈 Day가 생긴다")
    void t9_clusterByGeographyHandlesMoreDaysThanPlaces() {
        List<TripPlace> places = List.of(
                tripPlace(10L, "A", PlaceCategoryType.ATTRACTION, 33.45, 126.50),
                tripPlace(11L, "B", PlaceCategoryType.ATTRACTION, 33.46, 126.51)
        );

        RoutePlanPreviewResponse result = planner.plan(
                List.of(day(1L, 1), day(2L, 2), day(3L, 3)), places);

        int totalItems = result.days().stream().mapToInt(d -> d.items().size()).sum();
        assertThat(totalItems).isEqualTo(2);
        assertThat(result.days()).anyMatch(d -> d.items().isEmpty());
    }

    @Test
    @DisplayName("t10 음식점은 60분, 명소는 90분 체류 시간을 부여한다")
    void t10_planAssignsCategoryBasedStayMinutes() {
        List<TripPlace> places = List.of(
                tripPlace(10L, "음식점A", PlaceCategoryType.FOOD, 33.4500, 126.5000),
                tripPlace(11L, "명소B", PlaceCategoryType.ATTRACTION, 33.4510, 126.5010)
        );

        RoutePlanPreviewResponse result = planner.plan(List.of(day(1L, 1)), places);

        var items = result.days().getFirst().items();
        // FOOD: 09:00 ~ 10:00 (60분)
        assertThat(items.get(0).startTime()).isEqualTo("09:00");
        assertThat(items.get(0).endTime()).isEqualTo("10:00");
        // ATTRACTION: 이전 종료 + 이동시간 이후 90분 체류
        assertThat(items.get(1).startTime()).isNotNull();
        int attractionEnd = timeToMinutes(items.get(1).endTime());
        int attractionStart = timeToMinutes(items.get(1).startTime());
        assertThat(attractionEnd - attractionStart).isEqualTo(90);
    }

    @Test
    @DisplayName("t11 21시 이후 배정되는 장소는 시간을 null로 둔다")
    void t11_planSetsNullTimeWhenDayExceedsCutoff() {
        // 09:00에 시작해서 ACTIVITY(120분)×6개면 21:00 초과
        List<TripPlace> places = new java.util.ArrayList<>();
        for (int i = 0; i < 6; i++) {
            places.add(tripPlace((long) (10 + i), "액티비티" + i,
                    PlaceCategoryType.ACTIVITY,
                    33.45 + i * 0.01, 126.50 + i * 0.01));
        }

        RoutePlanPreviewResponse result = planner.plan(List.of(day(1L, 1)), places);

        var items = result.days().getFirst().items();
        // 일부 아이템은 반드시 null (21시 초과)
        assertThat(items).anyMatch(item -> item.startTime() == null);
    }

    @Test
    @DisplayName("t12 첫 시간 초과 장소 이후의 모든 장소는 시간 미정으로 반환한다")
    void t12_planKeepsRemainingItemsUnscheduledAfterCutoff() {
        List<TripPlace> places = new java.util.ArrayList<>();
        for (int i = 0; i < 6; i++) {
            places.add(tripPlace(
                    (long) (10 + i),
                    "액티비티" + i,
                    PlaceCategoryType.ACTIVITY,
                    33.45 + i * 0.001,
                    126.50 + i * 0.001
            ));
        }
        places.add(tripPlace(
                20L,
                "마지막 카페",
                PlaceCategoryType.CAFE,
                33.456,
                126.506
        ));

        RoutePlanPreviewResponse result =
                planner.plan(List.of(day(1L, 1)), places);

        var items = result.days().getFirst().items();
        int firstUnscheduledIndex = -1;
        for (int index = 0; index < items.size(); index++) {
            if (items.get(index).startTime() == null) {
                firstUnscheduledIndex = index;
                break;
            }
        }

        assertThat(firstUnscheduledIndex).isGreaterThanOrEqualTo(0);
        assertThat(items.subList(firstUnscheduledIndex, items.size()))
                .allMatch(item ->
                        item.startTime() == null && item.endTime() == null);
    }

    @Test
    @DisplayName("t13 지리 코스와 동일한 스타일 코스는 중복 반환하지 않는다")
    void t13_planMultiRemovesDuplicateRouteOptions() {
        List<TripPlace> places = List.of(
                tripPlace(
                        10L,
                        "음식점",
                        PlaceCategoryType.FOOD,
                        33.45,
                        126.50
                ),
                tripPlace(
                        11L,
                        "카페",
                        PlaceCategoryType.CAFE,
                        33.46,
                        126.51
                )
        );

        var options = planner.planMulti(
                List.of(day(1L, 1)),
                places,
                Set.of(TravelStyle.FOOD)
        );

        assertThat(options).hasSize(1);
        assertThat(options.getFirst().routeLabel())
                .isEqualTo("지리 최적 코스");
    }

    @Test
    @DisplayName("t14 OpenAI 추천이 유효하면 AI 코스를 첫 번째 옵션으로 반환한다")
    void t14_planMultiPlacesAiRecommendationFirst() {
        List<ItineraryDay> days = List.of(day(1L, 1), day(2L, 2));
        List<TripPlace> places = List.of(
                tripPlace(
                        10L,
                        "장소 A",
                        PlaceCategoryType.ATTRACTION,
                        33.45,
                        126.50
                ),
                tripPlace(
                        11L,
                        "장소 B",
                        PlaceCategoryType.CAFE,
                        33.55,
                        126.60
                )
        );
        when(openAiRouteAdvisor.recommend(days, places, Set.of()))
                .thenReturn(Optional.of(
                        new OpenAiRouteAdvisor.Recommendation(
                                "AI가 여행 스타일을 고려해 배치했어요.",
                                List.of(List.of(11L), List.of(10L))
                        )
                ));

        var options = planner.planMulti(days, places, Set.of());

        assertThat(options.getFirst().routeLabel())
                .isEqualTo("AI 추천 코스");
        assertThat(options.getFirst().plan().days().getFirst().items())
                .extracting(item -> item.tripPlaceId())
                .containsExactly(11L);
    }
}
