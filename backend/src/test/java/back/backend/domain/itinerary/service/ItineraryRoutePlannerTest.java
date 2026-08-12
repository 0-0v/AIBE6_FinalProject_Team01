package back.backend.domain.itinerary.service;

import back.backend.domain.itinerary.dto.response.RoutePlanPreviewResponse;
import back.backend.domain.itinerary.entity.ItineraryDay;
import back.backend.domain.place.entity.Place;
import back.backend.domain.place.entity.PlaceCategory;
import back.backend.domain.place.entity.PlaceCategoryType;
import back.backend.domain.place.entity.PlaceMarkerIcon;
import back.backend.domain.place.entity.TripPlace;
import back.backend.domain.place.entity.TripPlaceStatus;
import back.backend.domain.place.service.PlaceStyleRelationService;
import back.backend.domain.trip.entity.TravelStyle;
import back.backend.domain.trip.entity.TravelPace;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ItineraryRoutePlannerTest {

    @Mock
    private PlaceStyleRelationService placeStyleRelationService;

    @Mock
    private ConstraintSorter constraintSorter;

    private ItineraryRoutePlanner planner;

    @BeforeEach
    void setUp() {
        lenient().when(placeStyleRelationService.resolveCompatibilities(
                org.mockito.ArgumentMatchers.anyList(),
                org.mockito.ArgumentMatchers.anySet()
        )).thenReturn(Map.of());
        // ConstraintSorter: 입력 리스트를 그대로 반환 (정렬 없이 통과)
        lenient().when(constraintSorter.sort(org.mockito.ArgumentMatchers.anyList(), org.mockito.ArgumentMatchers.any()))
                .thenAnswer(inv -> inv.getArgument(0));

        planner = new ItineraryRoutePlanner(
                constraintSorter,
                placeStyleRelationService
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
                Set.of(TravelStyle.FOOD),
                TripScheduleSettings.defaultSettings()
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
    @DisplayName("t4 여행 스타일 입력 시 맞춤 추천과 지리·스타일별 코스를 반환한다")
    void t4_multiStyleProducesGeoFirstPlusStyleOptions() {
        List<ItineraryDay> days = List.of(day(1L, 1), day(2L, 2));
        List<TripPlace> places = List.of(
                tripPlace(10L, "음식점", PlaceCategoryType.FOOD, 33.4500, 126.5000),
                tripPlace(11L, "카페", PlaceCategoryType.CAFE, 33.4510, 126.5010),
                tripPlace(12L, "명소", PlaceCategoryType.ATTRACTION, 33.5000, 126.5500),
                tripPlace(13L, "자연", PlaceCategoryType.NATURE, 33.5010, 126.5510)
        );
        Set<TravelStyle> styles = Set.of(TravelStyle.FOOD, TravelStyle.NATURE);

        var options = planner.planMulti(days, places, styles, TripScheduleSettings.defaultSettings());

        assertThat(options).hasSize(4);
        assertThat(options.get(0).routeLabel()).isEqualTo("맞춤 추천 코스");
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

        var options = planner.planMulti(days, places, Set.of(), TripScheduleSettings.defaultSettings());

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

        var options = planner.planMulti(days, places, styles, TripScheduleSettings.defaultSettings());
        var geoOption = options.stream()
                .filter(option -> option.routeLabel().equals("지리 최적 코스"))
                .findFirst()
                .orElseThrow();
        var styleOption = options.stream()
                .filter(option -> option.routeLabel().startsWith("맛집"))
                .findFirst()
                .orElseThrow();
        var geoDay1 = geoOption.plan().days().get(0).items().stream()
                .map(i -> i.placeName()).toList();
        var styleDay1 = styleOption.plan().days().get(0).items().stream()
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
                Set.of(TravelStyle.FOOD),
                TripScheduleSettings.defaultSettings()
        );

        assertThat(options).hasSize(1);
        assertThat(options.getFirst().routeLabel())
                .isEqualTo("맞춤 추천 코스");
    }

    @Test
    @DisplayName("t14 저장된 스타일 관계 점수가 높은 장소를 맞춤 코스 앞쪽에 배치한다")
    void t14_planMultiAppliesRelationPriorityFirst() {
        List<ItineraryDay> days = List.of(day(1L, 1), day(2L, 2));
        List<TripPlace> places = List.of(
                tripPlace(10L, "장소 A", PlaceCategoryType.ATTRACTION, 33.45, 126.50),
                tripPlace(11L, "장소 B", PlaceCategoryType.ATTRACTION, 33.55, 126.60),
                tripPlace(12L, "장소 C", PlaceCategoryType.ATTRACTION, 33.65, 126.70)
        );
        Set<TravelStyle> styles = Set.of(TravelStyle.FAMOUS_ATTRACTIONS);
        when(placeStyleRelationService.resolveCompatibilities(places, styles))
                .thenReturn(Map.of(12L, 0.9, 10L, 0.8, 11L, 0.1));

        var options = planner.planMulti(days, places, styles, TripScheduleSettings.defaultSettings());

        assertThat(options.getFirst().routeLabel()).isEqualTo("맞춤 추천 코스");
        assertThat(options.getFirst().plan().days().getFirst().items())
                .extracting(item -> item.tripPlaceId())
                .containsExactly(12L, 11L);
        assertThat(options.getFirst().plan().days().get(1).items())
                .extracting(item -> item.tripPlaceId())
                .containsExactly(10L);
    }

    @Test
    @DisplayName("t15 Day별 출발지와 가장 가까운 장소를 첫 방문지로 배치한다")
    void t15_planStartsEachDayAtPlaceNearestToDeparture() {
        ItineraryDay firstDay = day(1L, 1);
        firstDay.updateDeparture(
                "CUSTOM",
                "북쪽 숙소",
                BigDecimal.valueOf(37.60),
                BigDecimal.valueOf(127.10),
                null
        );
        ItineraryDay secondDay = day(2L, 2);
        secondDay.updateDeparture(
                "CUSTOM",
                "남쪽 숙소",
                BigDecimal.valueOf(33.20),
                BigDecimal.valueOf(126.20),
                null
        );
        List<TripPlace> places = List.of(
                tripPlace(10L, "북쪽 원거리", PlaceCategoryType.ATTRACTION, 37.40, 126.90),
                tripPlace(11L, "북쪽 장소", PlaceCategoryType.ATTRACTION, 37.59, 127.09),
                tripPlace(12L, "남쪽 원거리", PlaceCategoryType.ATTRACTION, 33.40, 126.40),
                tripPlace(13L, "남쪽 장소", PlaceCategoryType.ATTRACTION, 33.21, 126.21)
        );

        RoutePlanPreviewResponse result = planner.plan(
                List.of(firstDay, secondDay),
                places
        );

        assertThat(result.days().getFirst().items().getFirst().placeName())
                .isEqualTo("북쪽 장소");
        assertThat(result.days().get(1).items().getFirst().placeName())
                .isEqualTo("남쪽 장소");
    }

    @Test
    @DisplayName("t16 재배치 시작 Day는 선택 일정 시각부터 시작하고 다음 Day는 기본 시각을 사용한다")
    void t16_replanUsesStartOverrideOnlyForSelectedDay() {
        ItineraryDay day1 = day(1L, 1);
        ItineraryDay day2 = day(2L, 2);
        List<TripPlace> places = List.of(
                tripPlace(10L, "한큐 우메다", PlaceCategoryType.SHOPPING, 34.7028, 135.4985),
                tripPlace(11L, "다음 장소", PlaceCategoryType.ATTRACTION, 34.7100, 135.5100)
        );
        TripScheduleSettings settings = TripScheduleSettings
                .of(LocalTime.of(9, 0), LocalTime.of(21, 0), TravelPace.NORMAL)
                .withDayStartOverride(1L, LocalTime.of(10, 46));

        RoutePlanPreviewResponse result = planner.planMulti(
                List.of(day1, day2),
                places,
                Set.of(),
                settings
        ).getFirst().plan();

        assertThat(result.days().getFirst().items().getFirst().startTime())
                .isEqualTo("10:46");
    }

    @Test
    @DisplayName("t17 동선 미리보기는 좌표 기반 예상 이동 정보를 계산한다")
    void t17_previewEstimatesTravelFromCoordinates() {
        List<TripPlace> places = List.of(
                tripPlace(10L, "장소 A", PlaceCategoryType.ATTRACTION, 33.45, 126.50),
                tripPlace(11L, "장소 B", PlaceCategoryType.ATTRACTION, 33.46, 126.51)
        );

        RoutePlanPreviewResponse result = planner.plan(
                List.of(day(1L, 1)),
                places
        );

        assertThat(result.days().getFirst().items().getFirst().transportMeters())
                .isPositive();
        assertThat(result.days().getFirst().items().getFirst().transportMinutes())
                .isPositive();
    }

    @Test
    @DisplayName("t18 여러 추천 옵션은 장소 관계 점수를 한 번만 일괄 조회한다")
    void t18_multiOptionsResolveRelationScoresOnce() {
        List<TripPlace> places = List.of(
                tripPlace(10L, "장소 A", PlaceCategoryType.ATTRACTION, 33.45, 126.50),
                tripPlace(11L, "장소 B", PlaceCategoryType.ATTRACTION, 33.46, 126.51)
        );
        Set<TravelStyle> styles = Set.of(TravelStyle.FAMOUS_ATTRACTIONS);

        planner.planMulti(
                List.of(day(1L, 1)),
                places,
                styles,
                TripScheduleSettings.defaultSettings()
        );

        verify(placeStyleRelationService).resolveCompatibilities(places, styles);
    }

    @Test
    @DisplayName("t19 재배치 결과에는 선택 장소와 변경 사유를 반영한 이유를 표시한다")
    void t19_replanResultExplainsWhyScheduleChanged() {
        String context = "선택 장소: 한큐 우메다. 변경 사유: 영업시간 변경. "
                + "재배치 시작 하한: 10:46. 이후 일정을 함께 조정함.";

        RoutePlanPreviewResponse result = planner.planMulti(
                List.of(day(1L, 1)),
                List.of(tripPlace(
                        10L,
                        "한큐 우메다",
                        PlaceCategoryType.SHOPPING,
                        34.7028,
                        135.4985
                )),
                Set.of(),
                TripScheduleSettings.defaultSettings(),
                "REPLAN_REMAINING_ITINERARY\n" + context
        ).getFirst().plan();

        assertThat(result.summary()).contains("변경 사유");
        assertThat(result.days().getFirst().items().getFirst().reason())
                .contains("한큐 우메다", "영업시간 변경", "10:46");
    }

    @Test
    @DisplayName("t20 영업시간 제약 장소는 지정한 Day와 개점 시각 이후에 배치한다")
    void t20_operatingHoursConstraintMovesPlaceToOpeningWindow() {
        ItineraryDay day1 = day(1L, 1);
        ItineraryDay day2 = day(2L, 2);
        TripPlace hankyu = tripPlace(
                10L,
                "한큐 우메다",
                PlaceCategoryType.SHOPPING,
                34.7028,
                135.4985
        );
        TripPlace another = tripPlace(
                11L,
                "다음 장소",
                PlaceCategoryType.ATTRACTION,
                34.7100,
                135.5100
        );
        TripScheduleSettings settings = TripScheduleSettings
                .defaultSettings()
                .withPlaceConstraint(
                        10L,
                        new PlaceScheduleConstraint(
                                2L,
                                LocalTime.of(11, 0),
                                "다음 영업 가능 시각에 배치했습니다."
                        )
                );

        RoutePlanPreviewResponse result = planner.planMulti(
                List.of(day1, day2),
                List.of(hankyu, another),
                Set.of(),
                settings
        ).getFirst().plan();

        assertThat(result.days().getFirst().items())
                .extracting(item -> item.tripPlaceId())
                .doesNotContain(10L);
        assertThat(result.days().get(1).items())
                .filteredOn(item -> item.tripPlaceId().equals(10L))
                .singleElement()
                .satisfies(item -> {
                    assertThat(item.startTime()).isEqualTo("11:00");
                    assertThat(item.reason()).contains("영업 가능 시각");
                });
    }

    @Test
    @DisplayName("t21 관계 점수로 만든 Day 묶음을 날짜별 출발지와 가까운 Day에 배정한다")
    void t21_relationClustersAreAlignedWithEachDayDeparture() {
        ItineraryDay northDay = day(1L, 1);
        northDay.updateDeparture(
                "CUSTOM",
                "북쪽 숙소",
                BigDecimal.valueOf(37.60),
                BigDecimal.valueOf(127.10),
                null
        );
        ItineraryDay southDay = day(2L, 2);
        southDay.updateDeparture(
                "CUSTOM",
                "남쪽 숙소",
                BigDecimal.valueOf(33.20),
                BigDecimal.valueOf(126.20),
                null
        );
        List<TripPlace> places = List.of(
                tripPlace(10L, "북쪽 장소 A", PlaceCategoryType.ATTRACTION, 37.59, 127.09),
                tripPlace(11L, "북쪽 장소 B", PlaceCategoryType.ATTRACTION, 37.58, 127.08),
                tripPlace(12L, "남쪽 장소 A", PlaceCategoryType.ATTRACTION, 33.21, 126.21),
                tripPlace(13L, "남쪽 장소 B", PlaceCategoryType.ATTRACTION, 33.22, 126.22)
        );
        Set<TravelStyle> styles = Set.of(TravelStyle.FAMOUS_ATTRACTIONS);
        when(placeStyleRelationService.resolveCompatibilities(places, styles))
                .thenReturn(Map.of(
                        12L, 0.9,
                        10L, 0.8,
                        13L, 0.7,
                        11L, 0.6
                ));

        RoutePlanPreviewResponse result = planner.planMulti(
                List.of(northDay, southDay),
                places,
                styles,
                TripScheduleSettings.defaultSettings()
        ).getFirst().plan();

        assertThat(result.days().getFirst().items())
                .extracting(item -> item.tripPlaceId())
                .containsExactlyInAnyOrder(10L, 11L);
        assertThat(result.days().get(1).items())
                .extracting(item -> item.tripPlaceId())
                .containsExactlyInAnyOrder(12L, 13L);
    }

    @Test
    @DisplayName("t22 저장 장소를 출발지로 선택하면 방문 일정에서는 제외한다")
    void t22_selectedDeparturePlaceIsExcludedFromVisits() {
        ItineraryDay itineraryDay = day(1L, 1);
        itineraryDay.updateDeparture(
                "TRIP_PLACE",
                "센타라 그랜드 호텔",
                BigDecimal.valueOf(34.67),
                BigDecimal.valueOf(135.50),
                10L
        );
        List<TripPlace> places = List.of(
                tripPlace(10L, "센타라 그랜드 호텔", PlaceCategoryType.LODGING, 34.67, 135.50),
                tripPlace(11L, "도톤보리", PlaceCategoryType.ATTRACTION, 34.668, 135.501)
        );

        RoutePlanPreviewResponse result = planner.planMulti(
                List.of(itineraryDay),
                places,
                Set.of(),
                TripScheduleSettings.defaultSettings()
        ).getFirst().plan();

        assertThat(result.totalPlaceCount()).isEqualTo(1);
        assertThat(result.days().getFirst().items())
                .extracting(item -> item.tripPlaceId())
                .containsExactly(11L);
    }
}
