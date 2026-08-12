package back.backend.domain.itinerary.service;

import back.backend.domain.itinerary.dto.response.RoutePlanDayResponse;
import back.backend.domain.itinerary.dto.response.RoutePlanItemResponse;
import back.backend.domain.itinerary.dto.response.RoutePlanOption;
import back.backend.domain.itinerary.dto.response.RoutePlanPreviewResponse;
import back.backend.domain.itinerary.entity.ItineraryDay;
import back.backend.domain.itinerary.entity.ItineraryTransportMode;
import back.backend.domain.place.entity.PlaceCategoryType;
import back.backend.domain.place.entity.TripPlace;
import back.backend.domain.place.service.PlaceStyleRelationService;
import back.backend.domain.trip.entity.TravelStyle;
import back.backend.domain.trip.entity.TravelPace;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Component
@RequiredArgsConstructor
public class ItineraryRoutePlanner {

    private static final int DEFAULT_STAY_MINUTES = 60;

    private static final Map<PlaceCategoryType, Integer> CATEGORY_STAY_MINUTES =
            Map.ofEntries(
                    Map.entry(PlaceCategoryType.FOOD,        60),
                    Map.entry(PlaceCategoryType.CAFE,        45),
                    Map.entry(PlaceCategoryType.BAR,         90),
                    Map.entry(PlaceCategoryType.ATTRACTION,  90),
                    Map.entry(PlaceCategoryType.NATURE,     120),
                    Map.entry(PlaceCategoryType.LODGING,     30),
                    Map.entry(PlaceCategoryType.SHOPPING,    60),
                    Map.entry(PlaceCategoryType.CONVENIENCE, 15),
                    Map.entry(PlaceCategoryType.ACTIVITY,   120),
                    Map.entry(PlaceCategoryType.TRANSPORT,   15),
                    Map.entry(PlaceCategoryType.OTHER,       60)
            );
    private static final DateTimeFormatter TIME_FORMATTER =
            DateTimeFormatter.ofPattern("HH:mm");

    private static final Map<TravelStyle, String> STYLE_LABEL = Map.of(
            TravelStyle.ACTIVITY, "액티비티 중심",
            TravelStyle.SNS_HOT_PLACE, "SNS 핫플 중심",
            TravelStyle.NATURE, "자연·힐링 중심",
            TravelStyle.FAMOUS_ATTRACTIONS, "관광명소 중심",
            TravelStyle.RELAXATION, "여유로운 힐링",
            TravelStyle.CULTURE_ART_HISTORY, "문화·역사 중심",
            TravelStyle.SHOPPING, "쇼핑 중심",
            TravelStyle.FOOD, "맛집 탐방 중심"
    );

    /**
     * 여행 스타일별 우선 카테고리 순서.
     * 앞에 있는 카테고리일수록 동선 앞쪽에 배치합니다.
     */
    private static final Map<TravelStyle, List<PlaceCategoryType>> STYLE_CATEGORY_PRIORITY = Map.of(
            TravelStyle.FOOD,
                    List.of(PlaceCategoryType.FOOD, PlaceCategoryType.CAFE, PlaceCategoryType.BAR),
            TravelStyle.ACTIVITY,
                    List.of(PlaceCategoryType.ACTIVITY, PlaceCategoryType.ATTRACTION, PlaceCategoryType.NATURE),
            TravelStyle.SNS_HOT_PLACE,
                    List.of(PlaceCategoryType.CAFE, PlaceCategoryType.ATTRACTION, PlaceCategoryType.FOOD, PlaceCategoryType.SHOPPING),
            TravelStyle.NATURE,
                    List.of(PlaceCategoryType.NATURE, PlaceCategoryType.ACTIVITY, PlaceCategoryType.ATTRACTION),
            TravelStyle.FAMOUS_ATTRACTIONS,
                    List.of(PlaceCategoryType.ATTRACTION, PlaceCategoryType.NATURE, PlaceCategoryType.ACTIVITY),
            TravelStyle.RELAXATION,
                    List.of(PlaceCategoryType.NATURE, PlaceCategoryType.CAFE, PlaceCategoryType.LODGING),
            TravelStyle.CULTURE_ART_HISTORY,
                    List.of(PlaceCategoryType.ATTRACTION, PlaceCategoryType.OTHER, PlaceCategoryType.ACTIVITY),
            TravelStyle.SHOPPING,
                    List.of(PlaceCategoryType.SHOPPING, PlaceCategoryType.FOOD, PlaceCategoryType.CAFE)
    );

    private final ConstraintSorter constraintSorter;
    private final PlaceStyleRelationService placeStyleRelationService;

    /**
     * 여행 스타일 수만큼 동선 옵션을 반환합니다. (스타일 없으면 균형 잡힌 코스 1개)
     */
    public List<RoutePlanOption> planMulti(
            List<ItineraryDay> itineraryDays,
            List<TripPlace> tripPlaces,
            Set<TravelStyle> travelStyles,
            TripScheduleSettings settings
    ) {
        return planMulti(
                itineraryDays,
                tripPlaces,
                travelStyles,
                settings,
                null
        );
    }

    public List<RoutePlanOption> planMulti(
            List<ItineraryDay> itineraryDays,
            List<TripPlace> tripPlaces,
            Set<TravelStyle> travelStyles,
            TripScheduleSettings settings,
            String userRequest
    ) {
        TripScheduleSettings effectiveSettings = settings != null
                ? settings : TripScheduleSettings.defaultSettings();
        List<ItineraryDay> days = sortedDays(itineraryDays);
        Set<Long> departurePlaceIds = days.stream()
                .map(ItineraryDay::getDepartureTripPlaceId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        List<TripPlace> eligibleTripPlaces = tripPlaces.stream()
                .filter(place -> !departurePlaceIds.contains(place.getId()))
                .toList();

        if (days.isEmpty() || eligibleTripPlaces.isEmpty()) {
            log.debug("일정 또는 장소 없음 — 빈 지리 최적 코스 반환");
            return List.of(new RoutePlanOption("지리 최적 코스",
                    emptyResponse(days, eligibleTripPlaces)));
        }

        List<RoutePlanOption> options = new ArrayList<>();
        Set<String> routeSignatures = new HashSet<>();
        String replanExplanation = extractReplanExplanation(userRequest);

        // 지리 기반 클러스터링 + 제약 정렬 (ConstraintSorter는 buildResponseFromClusters 내부에서 적용)
        List<List<TripPlace>> geoClusters = clusterByGeography(eligibleTripPlaces, days.size());
        String defaultGeoSummary = String.format(
                "저장한 장소 %d곳을 지역별로 묶어 %d일에 나눴어요.",
                eligibleTripPlaces.size(),
                days.size()
        );
        RoutePlanPreviewResponse geoPlan = buildResponseFromClusters(
                days,
                geoClusters,
                eligibleTripPlaces.size(),
                replanExplanation == null
                        ? defaultGeoSummary
                        : "변경 사유와 시작 시각 하한을 반영해 이후 일정을 다시 배치했습니다. "
                        + defaultGeoSummary,
                replanExplanation,
                effectiveSettings
        );

        if (!travelStyles.isEmpty()) {
            Map<Long, Double> relationScores = placeStyleRelationService
                    .resolveCompatibilities(eligibleTripPlaces, travelStyles);
            List<List<TripPlace>> relationClusters = clusterByRelationPriority(
                    eligibleTripPlaces,
                    days.size(),
                    relationScores
            );
            RoutePlanPreviewResponse relationPlan = buildResponseFromClusters(
                    days,
                    relationClusters,
                    eligibleTripPlaces.size(),
                    replanExplanation == null
                            ? "저장된 장소 관계와 여행 스타일을 함께 반영한 맞춤 코스예요."
                            : "변경 사유와 저장된 장소 관계를 반영해 일정을 다시 배치했습니다.",
                    replanExplanation == null
                            ? "저장된 장소의 스타일 관계 점수가 높은 순서와 이동 거리를 함께 고려했어요."
                            : replanExplanation,
                    effectiveSettings
            );
            if (routeSignatures.add(routeSignature(relationPlan))) {
                options.add(new RoutePlanOption("맞춤 추천 코스", relationPlan));
            }
        }

        if (routeSignatures.add(routeSignature(geoPlan))) {
            options.add(new RoutePlanOption("지리 최적 코스", geoPlan));
        }

        // 스타일별 코스 추가
        if (!travelStyles.isEmpty()) {
            log.info("카테고리 우선순위 기반 동선 계획 — 장소 {}개, {}일, 스타일 {}",
                    eligibleTripPlaces.size(), days.size(), travelStyles);
        }
        List<TravelStyle> orderedStyles = travelStyles.stream()
                .sorted(Comparator.comparingInt(Enum::ordinal))
                .toList();
        for (TravelStyle style : orderedStyles) {
            List<PlaceCategoryType> priority =
                    STYLE_CATEGORY_PRIORITY.getOrDefault(style, List.of());
            String styleLabel = STYLE_LABEL.getOrDefault(style, style.name());
            String label = styleLabel + " 코스";
            List<List<TripPlace>> styleClusters =
                    clusterByStylePriority(eligibleTripPlaces, days.size(), priority);
            RoutePlanPreviewResponse stylePlan = buildResponseFromClusters(
                    days,
                    styleClusters,
                    eligibleTripPlaces.size(),
                    buildStyleSummary(
                            styleLabel,
                            eligibleTripPlaces.size(),
                            days.size(),
                            priority
                    ),
                    replanExplanation == null
                            ? buildStyleReason(styleLabel)
                            : replanExplanation,
                    effectiveSettings
            );
            if (routeSignatures.add(routeSignature(stylePlan))) {
                options.add(new RoutePlanOption(label, stylePlan));
            }
        }

        return options;
    }

    private String extractReplanExplanation(String userRequest) {
        if (userRequest == null) {
            return null;
        }
        for (String prefix : List.of(
                "REPLAN_REMAINING_ITINERARY",
                "REPLAN_SINGLE_DAY"
        )) {
            if (userRequest.startsWith(prefix)) {
                String context = userRequest.substring(prefix.length()).trim();
                return context.isBlank() ? null : context;
            }
        }
        return null;
    }

    /**
     * 기존 단일 경로 API와의 하위 호환을 위해 유지합니다.
     */
    public RoutePlanPreviewResponse plan(
            List<ItineraryDay> itineraryDays,
            List<TripPlace> tripPlaces
    ) {
        List<RoutePlanOption> options = planMulti(
                itineraryDays, tripPlaces, Set.of(), TripScheduleSettings.defaultSettings());
        return options.isEmpty() ? emptyResponse(itineraryDays, tripPlaces) : options.get(0).plan();
    }

    // ── 지리적 클러스터링 ──────────────────────────────────────────────────────

    /**
     * 지리적으로 분산된 K개 초기 중심을 선택한다.
     * - 중심 0: 전체 평균 위치에서 가장 가까운 장소
     * - 이후 중심: 기존 중심들로부터 가장 먼 장소 (deterministic max-distance)
     */
    private List<GeoPoint> initializeCentroids(List<TripPlace> places, int count) {
        List<TripPlace> centroidPlaces = new ArrayList<>();

        double meanLat = places.stream()
                .mapToDouble(p -> p.getPlace().getLatitude().doubleValue())
                .average().orElse(0);
        double meanLng = places.stream()
                .mapToDouble(p -> p.getPlace().getLongitude().doubleValue())
                .average().orElse(0);

        TripPlace first = places.stream()
                .min(Comparator.comparingDouble(p -> {
                    double dLat = p.getPlace().getLatitude().doubleValue() - meanLat;
                    double dLng = p.getPlace().getLongitude().doubleValue() - meanLng;
                    return dLat * dLat + dLng * dLng;
                }))
                .orElse(places.get(0));
        centroidPlaces.add(first);

        while (centroidPlaces.size() < count) {
            List<TripPlace> currentCentroids =
                    new ArrayList<>(centroidPlaces);
            TripPlace farthest = places.stream()
                    .filter(p -> !currentCentroids.contains(p))
                    .max(Comparator.comparingDouble(p ->
                            currentCentroids.stream()
                                    .mapToDouble(c -> distanceMeters(p, c))
                                    .min().orElse(0)))
                    .orElse(places.get(
                            centroidPlaces.size() % places.size()
                    ));
            centroidPlaces.add(farthest);
        }

        return centroidPlaces.stream()
                .map(this::toGeoPoint)
                .toList();
    }

    /**
     * 장소를 dayCount개 지리적 클러스터로 분리한다.
     * Farthest-first 초기 중심 선택 후 중심 재계산을 반복한다.
     * Soft cap(평균 × 1.5)으로 극단적 불균형 방지.
     * 각 클러스터 내부는 NN으로 정렬.
     */
    private List<List<TripPlace>> clusterByGeography(List<TripPlace> places, int dayCount) {
        if (dayCount <= 0 || places.isEmpty()) return List.of();

        if (dayCount >= places.size()) {
            List<List<TripPlace>> result = new ArrayList<>();
            for (TripPlace p : places) result.add(new ArrayList<>(List.of(p)));
            while (result.size() < dayCount) result.add(new ArrayList<>());
            return result;
        }

        int maxPerDay = (int) Math.ceil((double) places.size() / dayCount * 1.5);
        List<GeoPoint> centroids = initializeCentroids(places, dayCount);
        List<List<TripPlace>> clusters = emptyClusters(dayCount);
        List<List<Long>> previousAssignments = List.of();

        for (int iteration = 0; iteration < 20; iteration++) {
            clusters = assignToCentroids(
                    places,
                    centroids,
                    maxPerDay
            );
            List<List<Long>> assignments = clusters.stream()
                    .map(cluster -> cluster.stream()
                            .map(TripPlace::getId)
                            .toList())
                    .toList();
            if (assignments.equals(previousAssignments)) {
                break;
            }
            previousAssignments = assignments;
            centroids = recomputeCentroids(clusters, centroids);
        }

        Map<Long, Integer> originalOrder = new HashMap<>();
        for (int index = 0; index < places.size(); index++) {
            originalOrder.put(places.get(index).getId(), index);
        }
        return clusters.stream()
                .map(cluster -> {
                    if (cluster.isEmpty()) {
                        return cluster;
                    }
                    List<TripPlace> orderedCluster =
                            new ArrayList<>(cluster);
                    orderedCluster.sort(Comparator.comparingInt(place ->
                            originalOrder.getOrDefault(
                                    place.getId(),
                                    Integer.MAX_VALUE
                            )));
                    return new ArrayList<>(
                            orderByNearestNeighbor(orderedCluster, 0)
                    );
                })
                .collect(Collectors.toList());
    }

    private List<List<TripPlace>> assignToCentroids(
            List<TripPlace> places,
            List<GeoPoint> centroids,
            int maxPerDay
    ) {
        List<List<TripPlace>> clusters = emptyClusters(centroids.size());
        List<TripPlace> assignmentOrder = places.stream()
                .sorted(Comparator.comparingDouble(place ->
                        centroids.stream()
                                .mapToDouble(centroid ->
                                        distanceMeters(place, centroid))
                                .min()
                                .orElse(Double.MAX_VALUE)))
                .toList();

        for (TripPlace place : assignmentOrder) {
            int targetIndex = -1;
            double nearestDistance = Double.MAX_VALUE;
            for (int index = 0; index < centroids.size(); index++) {
                if (clusters.get(index).size() >= maxPerDay) {
                    continue;
                }
                double distance = distanceMeters(
                        place,
                        centroids.get(index)
                );
                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    targetIndex = index;
                }
            }
            if (targetIndex < 0) {
                targetIndex = indexOfSmallestCluster(clusters);
            }
            clusters.get(targetIndex).add(place);
        }
        return clusters;
    }

    private List<GeoPoint> recomputeCentroids(
            List<List<TripPlace>> clusters,
            List<GeoPoint> previousCentroids
    ) {
        List<GeoPoint> centroids = new ArrayList<>();
        for (int index = 0; index < clusters.size(); index++) {
            List<TripPlace> cluster = clusters.get(index);
            if (cluster.isEmpty()) {
                centroids.add(previousCentroids.get(index));
                continue;
            }
            centroids.add(new GeoPoint(
                    cluster.stream()
                            .mapToDouble(place -> place.getPlace()
                                    .getLatitude().doubleValue())
                            .average()
                            .orElse(previousCentroids.get(index).latitude()),
                    cluster.stream()
                            .mapToDouble(place -> place.getPlace()
                                    .getLongitude().doubleValue())
                            .average()
                            .orElse(previousCentroids.get(index).longitude())
            ));
        }
        return centroids;
    }

    private List<List<TripPlace>> emptyClusters(int count) {
        List<List<TripPlace>> clusters = new ArrayList<>();
        for (int index = 0; index < count; index++) {
            clusters.add(new ArrayList<>());
        }
        return clusters;
    }

    private int indexOfSmallestCluster(
            List<List<TripPlace>> clusters
    ) {
        int smallestIndex = 0;
        for (int index = 1; index < clusters.size(); index++) {
            if (clusters.get(index).size()
                    < clusters.get(smallestIndex).size()) {
                smallestIndex = index;
            }
        }
        return smallestIndex;
    }

    private GeoPoint toGeoPoint(TripPlace place) {
        return new GeoPoint(
                place.getPlace().getLatitude().doubleValue(),
                place.getPlace().getLongitude().doubleValue()
        );
    }

    private record GeoPoint(double latitude, double longitude) {
    }

    /**
     * 카테고리 우선순위로 장소를 Day 클러스터로 분리한다.
     * 우선 카테고리 장소들이 앞쪽 Day에 배정되고, Day 내부는 NN 정렬.
     */
    private List<List<TripPlace>> clusterByStylePriority(
            List<TripPlace> places,
            int dayCount,
            List<PlaceCategoryType> priority
    ) {
        if (dayCount <= 0 || places.isEmpty()) return List.of();

        Map<PlaceCategoryType, Integer> scoreMap = new HashMap<>();
        for (int i = 0; i < priority.size(); i++) scoreMap.put(priority.get(i), i);

        Map<Integer, List<TripPlace>> buckets = new LinkedHashMap<>();
        for (TripPlace place : places) {
            int score = scoreMap.getOrDefault(
                    place.getCategory().getCategoryType(), priority.size());
            buckets.computeIfAbsent(score, k -> new ArrayList<>()).add(place);
        }

        int maxPerDay = (int) Math.ceil((double) places.size() / dayCount * 1.5);
        List<List<TripPlace>> clusters = new ArrayList<>();
        for (int i = 0; i < dayCount; i++) clusters.add(new ArrayList<>());

        int dayIdx = 0;
        for (int bucket = 0; bucket <= priority.size(); bucket++) {
            List<TripPlace> bucketPlaces = buckets.getOrDefault(bucket, List.of());
            for (TripPlace place : bucketPlaces) {
                while (dayIdx < dayCount - 1 && clusters.get(dayIdx).size() >= maxPerDay) {
                    dayIdx++;
                }
                clusters.get(dayIdx).add(place);
            }
        }

        return clusters.stream()
                .map(cluster -> cluster.isEmpty()
                        ? cluster
                        : new ArrayList<>(orderByNearestNeighbor(cluster, 0)))
                .collect(Collectors.toList());
    }

    private List<List<TripPlace>> clusterByRelationPriority(
            List<TripPlace> places,
            int dayCount,
            Map<Long, Double> relationScores
    ) {
        if (dayCount <= 0 || places.isEmpty()) return List.of();

        List<TripPlace> prioritized = places.stream()
                .sorted(Comparator
                        .comparingDouble((TripPlace place) -> relationScores
                                .getOrDefault(place.getId(), 0.0))
                        .reversed()
                        .thenComparing(TripPlace::getId))
                .toList();
        List<List<TripPlace>> clusters = emptyClusters(dayCount);
        for (int index = 0; index < prioritized.size(); index++) {
            clusters.get(index % dayCount).add(prioritized.get(index));
        }
        return clusters.stream()
                .map(cluster -> cluster.isEmpty()
                        ? cluster
                        : new ArrayList<>(orderByNearestNeighbor(cluster, 0)))
                .collect(Collectors.toList());
    }

    private RoutePlanPreviewResponse buildResponseFromClusters(
            List<ItineraryDay> days,
            List<List<TripPlace>> clusters,
            int totalPlaceCount,
            String summary,
            String defaultReason,
            TripScheduleSettings settings
    ) {
        List<List<TripPlace>> departureAlignedClusters =
                alignClustersToDepartures(days, clusters);
        List<List<TripPlace>> constrainedClusters = applyPlaceConstraints(
                days,
                departureAlignedClusters,
                settings
        );
        List<RoutePlanDayResponse> plannedDays = new ArrayList<>();
        int totalDistanceMeters = 0;

        for (int i = 0; i < days.size(); i++) {
            ItineraryDay day = days.get(i);
            List<TripPlace> dayPlaces = i < constrainedClusters.size()
                    ? constrainedClusters.get(i) : List.of();
            List<TripPlace> constrainedPlaces = constraintSorter.sort(
                    dayPlaces,
                    day.getItineraryDate()
            );
            List<TripPlace> sortedPlaces = prioritizeDeparture(
                    day,
                    constrainedPlaces
            );
            RoutePlanDayResponse plannedDay = planDay(day, sortedPlaces, defaultReason, settings);
            plannedDays.add(plannedDay);
            totalDistanceMeters += plannedDay.totalDistanceMeters();
        }

        return new RoutePlanPreviewResponse(summary, totalPlaceCount, totalDistanceMeters, plannedDays);
    }

    private List<List<TripPlace>> alignClustersToDepartures(
            List<ItineraryDay> days,
            List<List<TripPlace>> clusters
    ) {
        if (days.stream().noneMatch(ItineraryDay::hasDeparture)
                || clusters.size() <= 1) {
            return clusters;
        }

        List<List<TripPlace>> aligned = new ArrayList<>(
                Collections.nCopies(days.size(), null)
        );
        Set<Integer> assignedClusterIndexes = new HashSet<>();

        for (int dayIndex = 0; dayIndex < days.size(); dayIndex++) {
            ItineraryDay day = days.get(dayIndex);
            if (!day.hasDeparture()) {
                continue;
            }
            GeoPoint departure = new GeoPoint(
                    day.getDepartureLat().doubleValue(),
                    day.getDepartureLng().doubleValue()
            );
            int nearestClusterIndex = java.util.stream.IntStream
                    .range(0, clusters.size())
                    .filter(index -> !assignedClusterIndexes.contains(index))
                    .boxed()
                    .min(Comparator.comparingDouble(index ->
                            distanceToCluster(departure, clusters.get(index))))
                    .orElse(-1);
            if (nearestClusterIndex >= 0) {
                aligned.set(dayIndex, clusters.get(nearestClusterIndex));
                assignedClusterIndexes.add(nearestClusterIndex);
            }
        }

        Iterator<List<TripPlace>> remainingClusters = java.util.stream.IntStream
                .range(0, clusters.size())
                .filter(index -> !assignedClusterIndexes.contains(index))
                .mapToObj(clusters::get)
                .iterator();
        for (int dayIndex = 0; dayIndex < aligned.size(); dayIndex++) {
            if (aligned.get(dayIndex) == null) {
                aligned.set(
                        dayIndex,
                        remainingClusters.hasNext()
                                ? remainingClusters.next() : List.of()
                );
            }
        }
        return aligned;
    }

    private double distanceToCluster(
            GeoPoint departure,
            List<TripPlace> cluster
    ) {
        return cluster.stream()
                .mapToDouble(place -> distanceMeters(place, departure))
                .min()
                .orElse(Double.MAX_VALUE);
    }

    private List<List<TripPlace>> applyPlaceConstraints(
            List<ItineraryDay> days,
            List<List<TripPlace>> clusters,
            TripScheduleSettings settings
    ) {
        List<List<TripPlace>> adjusted = new ArrayList<>();
        for (int index = 0; index < days.size(); index++) {
            adjusted.add(new ArrayList<>(
                    index < clusters.size() ? clusters.get(index) : List.of()
            ));
        }
        settings.placeConstraints().forEach((tripPlaceId, constraint) -> {
            TripPlace constrainedPlace = adjusted.stream()
                    .flatMap(List::stream)
                    .filter(place -> place.getId().equals(tripPlaceId))
                    .findFirst()
                    .orElse(null);
            if (constrainedPlace == null) return;
            adjusted.forEach(dayPlaces -> dayPlaces.removeIf(
                    place -> place.getId().equals(tripPlaceId)
            ));
            for (int index = 0; index < days.size(); index++) {
                if (days.get(index).getId().equals(constraint.dayId())) {
                    adjusted.get(index).add(constrainedPlace);
                    break;
                }
            }
        });
        return adjusted;
    }

    private List<TripPlace> prioritizeDeparture(
            ItineraryDay day,
            List<TripPlace> places
    ) {
        if (!day.hasDeparture() || places.size() <= 1) {
            return places;
        }

        GeoPoint departure = new GeoPoint(
                day.getDepartureLat().doubleValue(),
                day.getDepartureLng().doubleValue()
        );
        TripPlace nearestPlace = places.stream()
                .min(Comparator.comparingDouble(place ->
                        distanceMeters(place, departure)))
                .orElseThrow();

        if (places.getFirst().getId().equals(nearestPlace.getId())) {
            return places;
        }

        List<TripPlace> reordered = new ArrayList<>(places.size());
        reordered.add(nearestPlace);
        places.stream()
                .filter(place -> !place.getId().equals(nearestPlace.getId()))
                .forEach(reordered::add);
        return reordered;
    }

    private RoutePlanDayResponse planDay(
            ItineraryDay day,
            List<TripPlace> places,
            String defaultReason,
            TripScheduleSettings settings
    ) {
        List<RoutePlanItemResponse> items = new ArrayList<>();
        int cursorMinutes = settings.dayStartMinutes(day.getId());
        int dayEndCutoff = settings.dayEndMinutes();
        double paceMultiplier = settings.travelPace().stayMultiplier();
        int totalDistanceMeters = 0;
        boolean timeSchedulingClosed = false;

        for (int index = 0; index < places.size(); index++) {
            TripPlace current = places.get(index);
            TripPlace next = index + 1 < places.size() ? places.get(index + 1) : null;
            PlaceScheduleConstraint placeConstraint = settings.placeConstraints()
                    .get(current.getId());
            if (placeConstraint != null
                    && placeConstraint.dayId().equals(day.getId())) {
                int earliestMinutes = placeConstraint.earliestStartTime().getHour() * 60
                        + placeConstraint.earliestStartTime().getMinute();
                cursorMinutes = Math.max(cursorMinutes, earliestMinutes);
            }

            int baseStay = CATEGORY_STAY_MINUTES.getOrDefault(
                    current.getCategory().getCategoryType(), DEFAULT_STAY_MINUTES);
            int stayMinutes = (int) Math.round(baseStay * paceMultiplier);
            int endMinutes = cursorMinutes + stayMinutes;
            boolean fitsInDay = !timeSchedulingClosed
                    && endMinutes <= dayEndCutoff;
            if (!fitsInDay) {
                timeSchedulingClosed = true;
            }

            RouteResult route = null;
            if (next != null) {
                int haversineMeters = (int) Math.round(distanceMeters(current, next));
                route = estimateRoute(
                        current,
                        next,
                        settings.effectiveTransportMode(haversineMeters)
                );
            }

            String reason = placeConstraint != null
                    ? placeConstraint.reason()
                    : buildItemReason(
                            index,
                            fitsInDay,
                            defaultReason,
                            settings,
                            day.getId()
                    );

            items.add(new RoutePlanItemResponse(
                    current.getId(),
                    current.getPlace().getName(),
                    current.getCategory().getName(),
                    current.getCategory().getMarkerColor(),
                    fitsInDay ? formatMinutes(cursorMinutes) : null,
                    fitsInDay ? formatMinutes(endMinutes) : null,
                    route != null ? route.durationMinutes() : null,
                    route != null ? route.distanceMeters() : null,
                    route != null ? route.transportMode() : null,
                    route != null ? route.transportDetail() : null,
                    reason
            ));

            if (route != null) {
                totalDistanceMeters += route.distanceMeters();
            }
            if (fitsInDay) {
                cursorMinutes = endMinutes + (route != null ? route.durationMinutes() : 0);
            }
        }

        return new RoutePlanDayResponse(
                day.getId(),
                day.getDayNumber(),
                day.getItineraryDate(),
                totalDistanceMeters,
                items
        );
    }

    private String buildItemReason(
            int index, boolean fitsInDay, String defaultReason, TripScheduleSettings settings, Long dayId) {
        if (!fitsInDay) return "하루 일정이 길어 방문 시간은 직접 조정해 주세요.";
        if (defaultReason != null) return defaultReason;
        if (index == 0) {
            return settings.dayStartTime(dayId).format(TIME_FORMATTER) + "부터 시작하는 첫 장소예요.";
        }
        return "이전 장소와 가까워 이동 부담이 적어요.";
    }

    private String buildStyleSummary(
            String styleLabel,
            int placeCount,
            int dayCount,
            List<PlaceCategoryType> priority
    ) {
        if (priority.isEmpty()) {
            return String.format("%s 스타일로 %d곳을 %d일에 나눴어요.", styleLabel, placeCount, dayCount);
        }
        String topCategories = priority.stream()
                .limit(2)
                .map(PlaceCategoryType::name)
                .map(this::categoryKoreanName)
                .collect(Collectors.joining("·"));
        return String.format("%s(%s)를 앞세워 %d곳을 %d일에 나눴어요.",
                styleLabel, topCategories, placeCount, dayCount);
    }

    private String buildStyleReason(String styleLabel) {
        return styleLabel + " 코스에 맞는 장소예요.";
    }

    private String routeSignature(RoutePlanPreviewResponse plan) {
        return plan.days().stream()
                .map(day -> day.items().stream()
                        .map(item -> String.valueOf(item.tripPlaceId()))
                        .collect(Collectors.joining(",")))
                .collect(Collectors.joining("|"));
    }

    private String categoryKoreanName(String type) {
        return switch (type) {
            case "FOOD" -> "음식점";
            case "CAFE" -> "카페";
            case "BAR" -> "술집";
            case "ATTRACTION" -> "명소";
            case "NATURE" -> "자연";
            case "LODGING" -> "숙소";
            case "SHOPPING" -> "쇼핑";
            case "ACTIVITY" -> "액티비티";
            case "TRANSPORT" -> "교통";
            default -> type;
        };
    }

    // ── 최근접 이웃 (Nearest Neighbor) ───────────────────────────────────────

    private List<TripPlace> orderByNearestNeighbor(List<TripPlace> places, int startIndex) {
        List<TripPlace> remaining = new ArrayList<>(places);
        List<TripPlace> ordered = new ArrayList<>();
        int clampedIndex = Math.max(0, Math.min(startIndex, remaining.size() - 1));
        TripPlace current = remaining.remove(clampedIndex);
        ordered.add(current);

        while (!remaining.isEmpty()) {
            TripPlace from = current;
            current = remaining.stream()
                    .min(Comparator.comparingDouble(candidate -> distanceMeters(from, candidate)))
                    .orElseThrow();
            remaining.remove(current);
            ordered.add(current);
        }
        return ordered;
    }

    // ── 미리보기용 거리 추정 ───────────────────────────────────────────────────

    private RouteResult estimateRoute(
            TripPlace from,
            TripPlace to,
            ItineraryTransportMode requestedMode
    ) {
        int haversineMeters = (int) Math.round(distanceMeters(from, to));
        return new RouteResult(
                haversineMeters,
                estimateTransportMinutes(
                        haversineMeters,
                        requestedMode.fallbackSpeedKmh()
                ),
                requestedMode.displayName(),
                null
        );
    }

    private record RouteResult(
            int distanceMeters,
            int durationMinutes,
            String transportMode,
            String transportDetail
    ) {}

    private int estimateTransportMinutes(
            int distanceMeters,
            double averageSpeedKmh
    ) {
        double minutes = distanceMeters / 1000.0 / averageSpeedKmh * 60.0;
        return Math.max(5, (int) Math.ceil(minutes / 5.0) * 5);
    }

    // ── 공통 유틸 ─────────────────────────────────────────────────────────────

    private RoutePlanPreviewResponse emptyResponse(
            List<ItineraryDay> itineraryDays,
            List<TripPlace> tripPlaces
    ) {
        return new RoutePlanPreviewResponse(
                "배치할 저장 장소가 없습니다.",
                tripPlaces.size(),
                0,
                sortedDays(itineraryDays).stream()
                        .map(day -> new RoutePlanDayResponse(
                                day.getId(), day.getDayNumber(), day.getItineraryDate(), 0, List.of()))
                        .toList()
        );
    }

    private List<ItineraryDay> sortedDays(List<ItineraryDay> days) {
        return days.stream()
                .sorted(Comparator.comparingInt(ItineraryDay::getDayNumber))
                .toList();
    }

    private String formatMinutes(int minutes) {
        return java.time.LocalTime.of(minutes / 60, minutes % 60).format(TIME_FORMATTER);
    }

    double distanceMeters(TripPlace first, TripPlace second) {
        return GeoDistanceCalculator.distanceMeters(first, second);
    }

    private double distanceMeters(
            TripPlace place,
            GeoPoint point
    ) {
        return GeoDistanceCalculator.distanceMeters(
                place.getPlace().getLatitude().doubleValue(),
                place.getPlace().getLongitude().doubleValue(),
                point.latitude(),
                point.longitude()
        );
    }
}
