package back.backend.domain.itinerary.service;

import back.backend.domain.itinerary.dto.response.RoutePlanDayResponse;
import back.backend.domain.itinerary.dto.response.RoutePlanItemResponse;
import back.backend.domain.itinerary.dto.response.RoutePlanOption;
import back.backend.domain.itinerary.dto.response.RoutePlanPreviewResponse;
import back.backend.domain.itinerary.entity.ItineraryDay;
import back.backend.domain.place.entity.PlaceCategoryType;
import back.backend.domain.place.entity.TripPlace;
import back.backend.domain.trip.entity.TravelStyle;
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

    private static final int DAY_START_MINUTES = 9 * 60;
    private static final int DAY_END_CUTOFF_MINUTES = 21 * 60; // 21:00
    private static final int DEFAULT_STAY_MINUTES = 60;
    private static final double AVERAGE_SPEED_KMH = 30.0;

    private static final Map<PlaceCategoryType, Integer> CATEGORY_STAY_MINUTES =
            Map.ofEntries(
                    Map.entry(PlaceCategoryType.FOOD,        60),
                    Map.entry(PlaceCategoryType.CAFE,        45),
                    Map.entry(PlaceCategoryType.BAR,         90),
                    Map.entry(PlaceCategoryType.ATTRACTION,  90),
                    Map.entry(PlaceCategoryType.NATURE,     120),
                    Map.entry(PlaceCategoryType.LODGING,     30),
                    Map.entry(PlaceCategoryType.SHOPPING,    60),
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

    private final GoogleDirectionsClient directionsClient;

    /**
     * 여행 스타일 수만큼 동선 옵션을 반환합니다. (스타일 없으면 균형 잡힌 코스 1개)
     */
    public List<RoutePlanOption> planMulti(
            List<ItineraryDay> itineraryDays,
            List<TripPlace> tripPlaces,
            Set<TravelStyle> travelStyles
    ) {
        if (travelStyles.isEmpty()) {
            log.debug("여행 스타일 미설정 — 균형 잡힌 코스 1개 생성");
            return List.of(new RoutePlanOption(
                    "균형 잡힌 코스",
                    planBalanced(itineraryDays, tripPlaces)
            ));
        }

        log.info("카테고리 우선순위 기반 동선 계획 — 장소 {}개, {}일, 스타일 {}",
                tripPlaces.size(), itineraryDays.size(), travelStyles);

        List<TravelStyle> styleList = new ArrayList<>(travelStyles);
        List<RoutePlanOption> options = new ArrayList<>();
        for (TravelStyle style : styleList) {
            String label = STYLE_LABEL.getOrDefault(style, style.name()) + " 코스";
            options.add(new RoutePlanOption(label,
                    planWithCategoryPriority(itineraryDays, tripPlaces, style)));
        }
        return options;
    }

    /**
     * 기존 단일 경로 API와의 하위 호환을 위해 유지합니다.
     */
    public RoutePlanPreviewResponse plan(
            List<ItineraryDay> itineraryDays,
            List<TripPlace> tripPlaces
    ) {
        List<RoutePlanOption> options = planMulti(itineraryDays, tripPlaces, Set.of());
        return options.isEmpty() ? emptyResponse(itineraryDays, tripPlaces) : options.get(0).plan();
    }

    // ── 카테고리 우선순위 기반 동선 ─────────────────────────────────────────────

    private RoutePlanPreviewResponse planWithCategoryPriority(
            List<ItineraryDay> itineraryDays,
            List<TripPlace> tripPlaces,
            TravelStyle style
    ) {
        List<PlaceCategoryType> priority =
                STYLE_CATEGORY_PRIORITY.getOrDefault(style, List.of());
        String styleLabel = STYLE_LABEL.getOrDefault(style, style.name());

        List<ItineraryDay> days = sortedDays(itineraryDays);
        if (days.isEmpty() || tripPlaces.isEmpty()) {
            return emptyResponse(days, tripPlaces);
        }

        List<TripPlace> orderedPlaces = orderByCategoryPriority(tripPlaces, priority);
        return buildResponse(days, orderedPlaces, tripPlaces.size(),
                buildStyleSummary(styleLabel, tripPlaces.size(), days.size(), priority),
                buildStyleReason(styleLabel));
    }

    private RoutePlanPreviewResponse planBalanced(
            List<ItineraryDay> itineraryDays,
            List<TripPlace> tripPlaces
    ) {
        List<ItineraryDay> days = sortedDays(itineraryDays);
        if (days.isEmpty() || tripPlaces.isEmpty()) {
            return emptyResponse(days, tripPlaces);
        }

        List<TripPlace> orderedPlaces = orderByNearestNeighbor(tripPlaces, 0);
        return buildResponse(days, orderedPlaces, tripPlaces.size(),
                String.format("저장한 장소 %d곳을 %d일에 나누고 가까운 장소끼리 연결했어요.",
                        tripPlaces.size(), days.size()),
                null);
    }

    /**
     * 카테고리 우선순위에 따라 장소를 정렬합니다.
     * 우선 카테고리 그룹 순으로, 각 그룹 내부는 최근접 이웃(NN)으로 지리적 효율을 유지합니다.
     */
    List<TripPlace> orderByCategoryPriority(
            List<TripPlace> places,
            List<PlaceCategoryType> priorityTypes
    ) {
        if (priorityTypes.isEmpty()) {
            return orderByNearestNeighbor(places, 0);
        }

        // 우선순위 점수 맵 (낮을수록 우선)
        Map<PlaceCategoryType, Integer> scoreMap = new HashMap<>();
        for (int i = 0; i < priorityTypes.size(); i++) {
            scoreMap.put(priorityTypes.get(i), i);
        }

        // 카테고리 우선순위 버킷으로 분리 (0 ~ priorityTypes.size())
        Map<Integer, List<TripPlace>> buckets = new LinkedHashMap<>();
        for (TripPlace place : places) {
            int score = scoreMap.getOrDefault(
                    place.getCategory().getCategoryType(),
                    priorityTypes.size()
            );
            buckets.computeIfAbsent(score, k -> new ArrayList<>()).add(place);
        }

        List<TripPlace> ordered = new ArrayList<>();
        for (int bucket = 0; bucket <= priorityTypes.size(); bucket++) {
            List<TripPlace> group = buckets.getOrDefault(bucket, List.of());
            if (group.isEmpty()) continue;

            // 이전 그룹의 마지막 장소와 가장 가까운 곳에서 시작
            int startIdx = 0;
            if (!ordered.isEmpty()) {
                TripPlace last = ordered.get(ordered.size() - 1);
                List<TripPlace> groupList = new ArrayList<>(group);
                TripPlace closest = groupList.stream()
                        .min(Comparator.comparingDouble(p -> distanceMeters(last, p)))
                        .orElse(groupList.get(0));
                startIdx = groupList.indexOf(closest);
            }
            ordered.addAll(orderByNearestNeighbor(new ArrayList<>(group), startIdx));
        }
        return ordered;
    }

    // ── 공통 플래닝 유틸 ──────────────────────────────────────────────────────

    private RoutePlanPreviewResponse buildResponse(
            List<ItineraryDay> days,
            List<TripPlace> orderedPlaces,
            int totalPlaceCount,
            String summary,
            String defaultReason
    ) {
        List<RoutePlanDayResponse> plannedDays = new ArrayList<>();
        int offset = 0;
        int totalDistanceMeters = 0;

        for (int dayIndex = 0; dayIndex < days.size(); dayIndex++) {
            int daySize = distributedSize(orderedPlaces.size(), days.size(), dayIndex);
            List<TripPlace> dayPlaces = orderedPlaces.subList(
                    offset,
                    Math.min(offset + daySize, orderedPlaces.size())
            );
            RoutePlanDayResponse plannedDay = planDay(days.get(dayIndex), dayPlaces, defaultReason);
            plannedDays.add(plannedDay);
            totalDistanceMeters += plannedDay.totalDistanceMeters();
            offset += daySize;
        }

        return new RoutePlanPreviewResponse(summary, totalPlaceCount, totalDistanceMeters, plannedDays);
    }

    private RoutePlanDayResponse planDay(
            ItineraryDay day,
            List<TripPlace> places,
            String defaultReason
    ) {
        List<RoutePlanItemResponse> items = new ArrayList<>();
        int cursorMinutes = DAY_START_MINUTES;
        int totalDistanceMeters = 0;

        for (int index = 0; index < places.size(); index++) {
            TripPlace current = places.get(index);
            TripPlace next = index + 1 < places.size() ? places.get(index + 1) : null;

            int stayMinutes = CATEGORY_STAY_MINUTES.getOrDefault(
                    current.getCategory().getCategoryType(), DEFAULT_STAY_MINUTES);
            int endMinutes = cursorMinutes + stayMinutes;
            boolean fitsInDay = endMinutes <= DAY_END_CUTOFF_MINUTES;

            RouteResult route = null;
            if (next != null) {
                int haversineMeters = (int) Math.round(distanceMeters(current, next));
                route = resolveRoute(current, next, inferTransportMode(haversineMeters));
            }

            String reason = buildItemReason(index, fitsInDay, defaultReason);

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

    private String buildItemReason(int index, boolean fitsInDay, String defaultReason) {
        if (!fitsInDay) return "하루 일정이 길어 방문 시간은 직접 조정해 주세요.";
        if (defaultReason != null) return defaultReason;
        return index == 0 ? "오전 9시부터 시작하는 첫 장소예요." : "이전 장소와 가까워 이동 부담이 적어요.";
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

    // ── Directions API / Haversine ────────────────────────────────────────────

    /**
     * Directions API로 실제 거리/시간 조회. 실패 시 Haversine 폴백.
     */
    private RouteResult resolveRoute(TripPlace from, TripPlace to, String transportMode) {
        double fromLat = from.getPlace().getLatitude().doubleValue();
        double fromLng = from.getPlace().getLongitude().doubleValue();
        double toLat   = to.getPlace().getLatitude().doubleValue();
        double toLng   = to.getPlace().getLongitude().doubleValue();

        return directionsClient
                .getRouteInfo(fromLat, fromLng, toLat, toLng, toDirectionsMode(transportMode))
                .map(info -> new RouteResult(info.distanceMeters(), info.durationMinutes(), transportMode))
                .orElseGet(() -> {
                    int haversineMeters = (int) Math.round(distanceMeters(from, to));
                    String mode = inferTransportMode(haversineMeters);
                    return new RouteResult(haversineMeters, estimateTransportMinutes(haversineMeters), mode);
                });
    }

    private record RouteResult(int distanceMeters, int durationMinutes, String transportMode) {}

    private String inferTransportMode(int distanceMeters) {
        if (distanceMeters < 500) return "도보";
        if (distanceMeters < 5_000) return "대중교통";
        return "자동차";
    }

    private static String toDirectionsMode(String transportMode) {
        return switch (transportMode) {
            case "도보" -> "walking";
            case "대중교통" -> "transit";
            default -> "driving";
        };
    }

    private int estimateTransportMinutes(int distanceMeters) {
        double minutes = distanceMeters / 1000.0 / AVERAGE_SPEED_KMH * 60.0;
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

    private int distributedSize(int placeCount, int dayCount, int dayIndex) {
        int base = placeCount / dayCount;
        int remainder = placeCount % dayCount;
        return base + (dayIndex < remainder ? 1 : 0);
    }

    private String formatMinutes(int minutes) {
        return java.time.LocalTime.of(minutes / 60, minutes % 60).format(TIME_FORMATTER);
    }

    double distanceMeters(TripPlace first, TripPlace second) {
        double lat1 = Math.toRadians(first.getPlace().getLatitude().doubleValue());
        double lat2 = Math.toRadians(second.getPlace().getLatitude().doubleValue());
        double deltaLat = lat2 - lat1;
        double deltaLng = Math.toRadians(
                second.getPlace().getLongitude().doubleValue()
                        - first.getPlace().getLongitude().doubleValue()
        );
        double haversine = Math.pow(Math.sin(deltaLat / 2), 2)
                + Math.cos(lat1) * Math.cos(lat2)
                * Math.pow(Math.sin(deltaLng / 2), 2);
        return 6_371_000 * 2 * Math.atan2(
                Math.sqrt(haversine),
                Math.sqrt(1 - haversine)
        );
    }
}
