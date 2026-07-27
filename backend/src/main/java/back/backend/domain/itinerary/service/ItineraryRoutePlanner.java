package back.backend.domain.itinerary.service;

import back.backend.domain.itinerary.dto.response.RoutePlanDayResponse;
import back.backend.domain.itinerary.dto.response.RoutePlanItemResponse;
import back.backend.domain.itinerary.dto.response.RoutePlanOption;
import back.backend.domain.itinerary.dto.response.RoutePlanPreviewResponse;
import back.backend.domain.itinerary.entity.ItineraryDay;
import back.backend.domain.place.entity.TripPlace;
import back.backend.domain.trip.entity.TravelStyle;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Component
@RequiredArgsConstructor
public class ItineraryRoutePlanner {

    private static final int DAY_START_MINUTES = 9 * 60;
    private static final int MINUTES_PER_DAY = 24 * 60;
    private static final int DEFAULT_STAY_MINUTES = 90;
    private static final double AVERAGE_SPEED_KMH = 30.0;
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

    private final GeminiClient geminiClient;
    private final GoogleDirectionsClient directionsClient;
    private final ObjectMapper objectMapper;

    /**
     * 여행 스타일 수만큼 동선 옵션을 반환합니다. (스타일 없으면 1개)
     * Gemini 호출에 실패하면 휴리스틱으로 폴백합니다.
     */
    public List<RoutePlanOption> planMulti(
            List<ItineraryDay> itineraryDays,
            List<TripPlace> tripPlaces,
            Set<TravelStyle> travelStyles
    ) {
        if (geminiClient.isConfigured()) {
            try {
                log.info("Gemini로 복수 동선 계획 시작 — 장소 {}개, {}일, 스타일 {}",
                        tripPlaces.size(), itineraryDays.size(), travelStyles);
                return planMultiWithGemini(itineraryDays, tripPlaces, travelStyles);
            } catch (Exception e) {
                log.warn("Gemini 복수 동선 계획 실패, 휴리스틱으로 폴백합니다: {}", e.getMessage());
            }
        } else {
            log.debug("AI_API_KEY 미설정 — 휴리스틱 알고리즘으로 복수 동선 계획");
        }
        return planMultiWithHeuristic(itineraryDays, tripPlaces, travelStyles);
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

    // ── Gemini 기반 복수 동선 계획 ────────────────────────────────────────────

    private List<RoutePlanOption> planMultiWithGemini(
            List<ItineraryDay> itineraryDays,
            List<TripPlace> tripPlaces,
            Set<TravelStyle> travelStyles
    ) throws Exception {
        String prompt = buildMultiPrompt(itineraryDays, tripPlaces, travelStyles);
        String responseText = geminiClient.generateContent(prompt);

        log.debug("Gemini 복수 동선 응답: {}", responseText);
        GeminiMultiRoutePlan multiPlan = objectMapper.readValue(responseText, GeminiMultiRoutePlan.class);

        List<RoutePlanOption> options = new ArrayList<>();
        for (GeminiMultiRoutePlan.GeminiSingleRoute route : multiPlan.routes()) {
            try {
                GeminiRoutePlan singlePlan = new GeminiRoutePlan(route.summary(), route.days());
                validateGeminiPlan(singlePlan, tripPlaces);
                RoutePlanPreviewResponse planResponse =
                        mapGeminiPlanToResponse(itineraryDays, tripPlaces, singlePlan);
                options.add(new RoutePlanOption(route.routeLabel(), planResponse));
            } catch (Exception e) {
                log.warn("Gemini 경로 '{}' 파싱 실패, 건너뜁니다: {}", route.routeLabel(), e.getMessage());
            }
        }

        if (options.isEmpty()) {
            throw new IllegalStateException("Gemini가 유효한 경로를 반환하지 않았습니다.");
        }
        return options;
    }

    private String buildMultiPrompt(
            List<ItineraryDay> days,
            List<TripPlace> places,
            Set<TravelStyle> travelStyles
    ) throws Exception {
        List<Map<String, Object>> placeData = places.stream()
                .map(p -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", p.getId());
                    m.put("name", p.getPlace().getName());
                    m.put("category", p.getCategory().getName());
                    m.put("lat", p.getPlace().getLatitude());
                    m.put("lng", p.getPlace().getLongitude());
                    return m;
                })
                .toList();

        String placeJson = objectMapper.writeValueAsString(placeData);

        // 스타일 없으면 균형 잡힌 코스 1개, 있으면 스타일 수만큼
        List<String> styleLabels = travelStyles.isEmpty()
                ? List.of()
                : travelStyles.stream()
                        .map(s -> STYLE_LABEL.getOrDefault(s, s.name()))
                        .toList();

        // 경로 요청 설명 (프롬프트 본문)
        String routeRequests;
        if (styleLabels.isEmpty()) {
            routeRequests = "- Route 1 (균형 잡힌 코스): 이동 거리를 최소화하고 관광·식당·카페 등 다양한 카테고리가 골고루 포함되도록 구성하세요.";
        } else {
            routeRequests = java.util.stream.IntStream.range(0, styleLabels.size())
                    .mapToObj(i -> "- Route %d (%s 코스): %s 스타일을 반영하여 관련 카테고리 장소에 충분한 시간을 배분하고 해당 스타일 중심으로 구성하세요."
                            .formatted(i + 1, styleLabels.get(i), styleLabels.get(i)))
                    .collect(Collectors.joining("\n"));
        }

        // JSON 출력 템플릿
        List<String> routeLabels = styleLabels.isEmpty()
                ? List.of("균형 잡힌 코스")
                : styleLabels.stream().map(l -> l + " 코스").toList();
        String jsonTemplate = buildJsonTemplate(routeLabels);

        int routeCount = routeLabels.size();
        String styleDescription = styleLabels.isEmpty()
                ? "없음"
                : String.join(", ", styleLabels);

        return """
                당신은 여행 일정 전문가입니다. 다음 장소들을 %d일 여행 일정으로 구성해 주세요.

                여행 스타일: %s

                장소 목록 (%d개):
                %s

                아래 %d가지 서로 다른 동선을 제안해 주세요.
                %s

                공통 조건:
                1. 위도/경도 기준 가까운 장소끼리 같은 날에 묶어 이동 거리를 최소화하세요.
                2. 카테고리가 다양하게 섞이도록 구성하세요 (관광지, 식당, 카페 등).
                3. 오전 09:00부터 시작하며 카테고리별 체류 시간을 현실적으로 배분하세요.
                   - 관광/명소/테마파크: 90~120분
                   - 식당/맛집: 60분
                   - 카페/베이커리: 45분
                   - 쇼핑/시장: 90분
                   - 기타: 60분
                4. 장소 간 이동 시간(분)을 체류 시간 뒤에 반드시 반영하세요.
                5. 모든 장소를 빠짐없이 포함하세요.
                6. reason은 한국어 15자 이내로 작성하세요.
                7. startTime과 endTime은 "HH:mm" 형식으로 작성하세요.
                8. 각 경로는 장소 배치 순서나 날짜 구성이 서로 달라야 합니다.
                9. transportMode는 다음 장소로 이동하는 수단입니다. 직선 거리 기준으로 판단하세요.
                   - 500m 미만: 도보
                   - 500m 이상 ~ 5km 미만: 대중교통
                   - 5km 이상: 자동차
                   마지막 장소는 transportMode를 null로 설정하세요.

                반드시 아래 JSON 형식만 출력하세요:
                %s
                """.formatted(
                days.size(), styleDescription, places.size(), placeJson,
                routeCount, routeRequests,
                jsonTemplate
        );
    }

    private String buildJsonTemplate(List<String> routeLabels) {
        String routeEntries = routeLabels.stream()
                .map(label -> """
                        {
                          "routeLabel": "%s",
                          "summary": "전체 여행 동선 한 줄 요약",
                          "days": [
                            {
                              "dayIndex": 0,
                              "places": [
                                {
                                  "id": <장소 id 숫자>,
                                  "startTime": "09:00",
                                  "endTime": "10:30",
                                  "transportMode": "도보|대중교통|자동차 중 하나",
                                  "reason": "방문 이유"
                                }
                              ]
                            }
                          ]
                        }""".formatted(label))
                .collect(Collectors.joining(",\n"));
        return "{\n  \"routes\": [\n" + routeEntries + "\n  ]\n}";
    }

    // ── 휴리스틱 복수 동선 계획 (폴백) ────────────────────────────────────────

    private List<RoutePlanOption> planMultiWithHeuristic(
            List<ItineraryDay> itineraryDays,
            List<TripPlace> tripPlaces,
            Set<TravelStyle> travelStyles
    ) {
        // 스타일 없으면 균형 잡힌 코스 1개
        if (travelStyles.isEmpty()) {
            return List.of(new RoutePlanOption(
                    "균형 잡힌 코스",
                    planWithHeuristic(itineraryDays, tripPlaces, 0)
            ));
        }

        // 스타일 수만큼 경로 생성 — 시작 장소를 달리해 경로 다양성 확보
        List<TravelStyle> styleList = new ArrayList<>(travelStyles);
        int n = styleList.size();
        int placeCount = tripPlaces.isEmpty() ? 1 : tripPlaces.size();

        List<RoutePlanOption> options = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            String label = STYLE_LABEL.getOrDefault(styleList.get(i), styleList.get(i).name()) + " 코스";
            int startIndex = (i * placeCount) / n;
            options.add(new RoutePlanOption(label,
                    planWithHeuristic(itineraryDays, tripPlaces, startIndex)));
        }
        return options;
    }

    private RoutePlanPreviewResponse planWithHeuristic(
            List<ItineraryDay> itineraryDays,
            List<TripPlace> tripPlaces,
            int startIndex
    ) {
        List<ItineraryDay> days = itineraryDays.stream()
                .sorted(Comparator.comparingInt(ItineraryDay::getDayNumber))
                .toList();

        if (days.isEmpty() || tripPlaces.isEmpty()) {
            return emptyResponse(days, tripPlaces);
        }

        List<TripPlace> orderedPlaces = orderByNearestNeighbor(tripPlaces, startIndex);
        List<RoutePlanDayResponse> plannedDays = new ArrayList<>();
        int offset = 0;
        int totalDistanceMeters = 0;

        for (int dayIndex = 0; dayIndex < days.size(); dayIndex++) {
            int daySize = distributedSize(orderedPlaces.size(), days.size(), dayIndex);
            List<TripPlace> dayPlaces = orderedPlaces.subList(
                    offset,
                    Math.min(offset + daySize, orderedPlaces.size())
            );
            RoutePlanDayResponse plannedDay = planHeuristicDay(days.get(dayIndex), dayPlaces);
            plannedDays.add(plannedDay);
            totalDistanceMeters += plannedDay.totalDistanceMeters();
            offset += daySize;
        }

        return new RoutePlanPreviewResponse(
                String.format("저장한 장소 %d곳을 %d일에 나누고 가까운 장소끼리 연결했어요.", tripPlaces.size(), days.size()),
                tripPlaces.size(),
                totalDistanceMeters,
                plannedDays
        );
    }

    private void validateGeminiPlan(GeminiRoutePlan plan, List<TripPlace> places) {
        Set<Long> validIds = places.stream()
                .map(TripPlace::getId)
                .collect(Collectors.toSet());

        Set<Long> returnedIds = plan.days().stream()
                .flatMap(d -> d.places().stream())
                .map(GeminiRoutePlan.GeminiPlace::id)
                .collect(Collectors.toSet());

        Set<Long> unknownIds = new HashSet<>(returnedIds);
        unknownIds.removeAll(validIds);
        if (!unknownIds.isEmpty()) {
            throw new IllegalStateException("Gemini가 알 수 없는 장소 ID를 반환했습니다: " + unknownIds);
        }

        Set<Long> missingIds = new HashSet<>(validIds);
        missingIds.removeAll(returnedIds);
        if (!missingIds.isEmpty()) {
            log.warn("Gemini 계획에 누락된 장소 {}개", missingIds.size());
            throw new IllegalStateException("Gemini 계획에 누락된 장소가 있습니다.");
        }
    }

    private RoutePlanPreviewResponse mapGeminiPlanToResponse(
            List<ItineraryDay> itineraryDays,
            List<TripPlace> tripPlaces,
            GeminiRoutePlan plan
    ) {
        Map<Long, TripPlace> placeById = tripPlaces.stream()
                .collect(Collectors.toMap(TripPlace::getId, p -> p));

        List<ItineraryDay> sortedDays = itineraryDays.stream()
                .sorted(Comparator.comparingInt(ItineraryDay::getDayNumber))
                .toList();

        List<GeminiRoutePlan.GeminiDay> sortedGeminiDays = plan.days().stream()
                .sorted(Comparator.comparingInt(GeminiRoutePlan.GeminiDay::dayIndex))
                .toList();

        List<RoutePlanDayResponse> dayResponses = new ArrayList<>();
        int totalDistanceMeters = 0;

        for (int i = 0; i < sortedDays.size(); i++) {
            ItineraryDay day = sortedDays.get(i);
            List<GeminiRoutePlan.GeminiPlace> geminiPlaces = i < sortedGeminiDays.size()
                    ? sortedGeminiDays.get(i).places()
                    : List.of();

            List<RoutePlanItemResponse> items = new ArrayList<>();
            int dayDistanceMeters = 0;

            for (int j = 0; j < geminiPlaces.size(); j++) {
                GeminiRoutePlan.GeminiPlace gp = geminiPlaces.get(j);
                TripPlace current = placeById.get(gp.id());
                if (current == null) continue;

                TripPlace next = (j + 1 < geminiPlaces.size())
                        ? placeById.get(geminiPlaces.get(j + 1).id())
                        : null;

                RouteResult route = null;
                if (next != null) {
                    String modeHint = gp.transportMode() != null
                            ? gp.transportMode()
                            : inferTransportMode((int) Math.round(distanceMeters(current, next)));
                    route = resolveRoute(current, next, modeHint);
                    dayDistanceMeters += route.distanceMeters();
                }

                items.add(new RoutePlanItemResponse(
                        current.getId(),
                        current.getPlace().getName(),
                        current.getCategory().getName(),
                        current.getCategory().getMarkerColor(),
                        gp.startTime(),
                        gp.endTime(),
                        route != null ? route.durationMinutes() : null,
                        route != null ? route.distanceMeters() : null,
                        route != null ? route.transportMode() : null,
                        gp.reason()
                ));
            }

            dayResponses.add(new RoutePlanDayResponse(
                    day.getId(),
                    day.getDayNumber(),
                    day.getItineraryDate(),
                    dayDistanceMeters,
                    items
            ));
            totalDistanceMeters += dayDistanceMeters;
        }

        return new RoutePlanPreviewResponse(
                plan.summary(),
                tripPlaces.size(),
                totalDistanceMeters,
                dayResponses
        );
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
                itineraryDays.stream()
                        .sorted(Comparator.comparingInt(ItineraryDay::getDayNumber))
                        .map(day -> new RoutePlanDayResponse(
                                day.getId(),
                                day.getDayNumber(),
                                day.getItineraryDate(),
                                0,
                                List.of()
                        ))
                        .toList()
        );
    }

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

    private RoutePlanDayResponse planHeuristicDay(ItineraryDay day, List<TripPlace> places) {
        List<RoutePlanItemResponse> items = new ArrayList<>();
        int cursorMinutes = DAY_START_MINUTES;
        int totalDistanceMeters = 0;

        for (int index = 0; index < places.size(); index++) {
            TripPlace current = places.get(index);
            TripPlace next = index + 1 < places.size() ? places.get(index + 1) : null;
            int endMinutes = cursorMinutes + DEFAULT_STAY_MINUTES;
            boolean fitsInDay = endMinutes < MINUTES_PER_DAY;

            RouteResult route = null;
            if (next != null) {
                int haversineMeters = (int) Math.round(distanceMeters(current, next));
                route = resolveRoute(current, next, inferTransportMode(haversineMeters));
            }

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
                    !fitsInDay
                            ? "하루 일정이 길어 방문 시간은 직접 조정해 주세요."
                            : index == 0
                            ? "오전 9시부터 시작하는 첫 장소예요."
                            : "이전 장소와 가까워 이동 부담이 적어요."
            ));

            if (route != null) {
                totalDistanceMeters += route.distanceMeters();
                if (fitsInDay) {
                    cursorMinutes = endMinutes + route.durationMinutes();
                }
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

    private int distributedSize(int placeCount, int dayCount, int dayIndex) {
        int base = placeCount / dayCount;
        int remainder = placeCount % dayCount;
        return base + (dayIndex < remainder ? 1 : 0);
    }

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

    private int estimateTransportMinutes(int distanceMeters) {
        double minutes = distanceMeters / 1000.0 / AVERAGE_SPEED_KMH * 60.0;
        return Math.max(5, (int) Math.ceil(minutes / 5.0) * 5);
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

    // ── Gemini 응답 파싱용 DTO ────────────────────────────────────────────────

    @JsonIgnoreProperties(ignoreUnknown = true)
    record GeminiMultiRoutePlan(List<GeminiSingleRoute> routes) {
        @JsonIgnoreProperties(ignoreUnknown = true)
        record GeminiSingleRoute(String routeLabel, String summary, List<GeminiRoutePlan.GeminiDay> days) {}
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record GeminiRoutePlan(String summary, List<GeminiDay> days) {

        @JsonIgnoreProperties(ignoreUnknown = true)
        record GeminiDay(int dayIndex, List<GeminiPlace> places) {}

        @JsonIgnoreProperties(ignoreUnknown = true)
        record GeminiPlace(long id, String startTime, String endTime, String transportMode, String reason) {}
    }
}
