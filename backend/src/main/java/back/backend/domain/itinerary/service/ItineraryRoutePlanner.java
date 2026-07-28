package back.backend.domain.itinerary.service;

import back.backend.domain.itinerary.dto.response.RoutePlanDayResponse;
import back.backend.domain.itinerary.dto.response.RoutePlanItemResponse;
import back.backend.domain.itinerary.dto.response.RoutePlanPreviewResponse;
import back.backend.domain.itinerary.entity.ItineraryDay;
import back.backend.domain.place.entity.TripPlace;
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

    private final GeminiClient geminiClient;
    private final ObjectMapper objectMapper;

    /**
     * Gemini로 먼저 동선을 계획하고, 실패 시 휴리스틱 알고리즘으로 폴백합니다.
     */
    public RoutePlanPreviewResponse plan(
            List<ItineraryDay> itineraryDays,
            List<TripPlace> tripPlaces
    ) {
        if (geminiClient.isConfigured()) {
            try {
                log.info("Gemini로 동선 계획 시작 — 장소 {}개, {}일", tripPlaces.size(), itineraryDays.size());
                return planWithGemini(itineraryDays, tripPlaces);
            } catch (Exception e) {
                log.warn("Gemini 동선 계획 실패, 휴리스틱으로 폴백합니다: {}", e.getMessage());
            }
        } else {
            log.debug("AI_API_KEY 미설정 — 휴리스틱 알고리즘으로 동선 계획");
        }
        return planWithHeuristic(itineraryDays, tripPlaces);
    }

    // ── Gemini 기반 동선 계획 ──────────────────────────────────────────────────

    private RoutePlanPreviewResponse planWithGemini(
            List<ItineraryDay> itineraryDays,
            List<TripPlace> tripPlaces
    ) throws Exception {
        String prompt = buildPrompt(itineraryDays, tripPlaces);
        String responseText = geminiClient.generateContent(prompt);

        log.debug("Gemini 응답: {}", responseText);
        GeminiRoutePlan plan = objectMapper.readValue(responseText, GeminiRoutePlan.class);

        validateGeminiPlan(plan, tripPlaces);
        return mapGeminiPlanToResponse(itineraryDays, tripPlaces, plan);
    }

    private String buildPrompt(List<ItineraryDay> days, List<TripPlace> places) throws Exception {
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

        return """
                당신은 여행 일정 전문가입니다. 다음 장소들을 %d일 여행 일정으로 구성해 주세요.

                장소 목록 (%d개):
                %s

                조건:
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

                반드시 아래 JSON 형식만 출력하세요:
                {
                  "summary": "전체 여행 동선 한 줄 요약",
                  "days": [
                    {
                      "dayIndex": 0,
                      "places": [
                        {
                          "id": <장소 id 숫자>,
                          "startTime": "09:00",
                          "endTime": "10:30",
                          "reason": "방문 이유"
                        }
                      ]
                    }
                  ]
                }
                """.formatted(days.size(), places.size(), placeJson);
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
            log.warn("Gemini 계획에 누락된 장소 {}개 — 휴리스틱으로 폴백합니다.", missingIds.size());
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

                Integer distMeters = next != null
                        ? (int) Math.round(distanceMeters(current, next))
                        : null;
                Integer transportMins = distMeters != null
                        ? estimateTransportMinutes(distMeters)
                        : null;

                if (distMeters != null) dayDistanceMeters += distMeters;

                items.add(new RoutePlanItemResponse(
                        current.getId(),
                        current.getPlace().getName(),
                        current.getCategory().getName(),
                        current.getCategory().getMarkerColor(),
                        gp.startTime(),
                        gp.endTime(),
                        transportMins,
                        distMeters,
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

    // ── 휴리스틱 동선 계획 (폴백) ──────────────────────────────────────────────

    private RoutePlanPreviewResponse planWithHeuristic(
            List<ItineraryDay> itineraryDays,
            List<TripPlace> tripPlaces
    ) {
        List<ItineraryDay> days = itineraryDays.stream()
                .sorted(Comparator.comparingInt(ItineraryDay::getDayNumber))
                .toList();

        if (days.isEmpty() || tripPlaces.isEmpty()) {
            return new RoutePlanPreviewResponse(
                    "배치할 저장 장소가 없습니다.",
                    tripPlaces.size(),
                    0,
                    days.stream()
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

        List<TripPlace> orderedPlaces = orderByNearestNeighbor(tripPlaces);
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
                String.format(
                        "저장한 장소 %d곳을 %d일에 나누고 가까운 장소끼리 연결했어요.",
                        tripPlaces.size(),
                        days.size()
                ),
                tripPlaces.size(),
                totalDistanceMeters,
                plannedDays
        );
    }

    private List<TripPlace> orderByNearestNeighbor(List<TripPlace> places) {
        List<TripPlace> remaining = new ArrayList<>(places);
        List<TripPlace> ordered = new ArrayList<>();
        TripPlace current = remaining.removeFirst();
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

            Integer distanceMeters = next == null
                    ? null
                    : (int) Math.round(distanceMeters(current, next));
            Integer transportMinutes = distanceMeters == null
                    ? null
                    : estimateTransportMinutes(distanceMeters);

            items.add(new RoutePlanItemResponse(
                    current.getId(),
                    current.getPlace().getName(),
                    current.getCategory().getName(),
                    current.getCategory().getMarkerColor(),
                    fitsInDay ? formatMinutes(cursorMinutes) : null,
                    fitsInDay ? formatMinutes(endMinutes) : null,
                    transportMinutes,
                    distanceMeters,
                    !fitsInDay
                            ? "하루 일정이 길어 방문 시간은 직접 조정해 주세요."
                            : index == 0
                            ? "오전 9시부터 시작하는 첫 장소예요."
                            : "이전 장소와 가까워 이동 부담이 적어요."
            ));

            if (distanceMeters != null) {
                totalDistanceMeters += distanceMeters;
                if (fitsInDay) {
                    cursorMinutes = endMinutes + transportMinutes;
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

    // ── 공통 유틸 ──────────────────────────────────────────────────────────────

    private int distributedSize(int placeCount, int dayCount, int dayIndex) {
        int base = placeCount / dayCount;
        int remainder = placeCount % dayCount;
        return base + (dayIndex < remainder ? 1 : 0);
    }

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

    // ── Gemini 응답 파싱용 DTO ─────────────────────────────────────────────────

    @JsonIgnoreProperties(ignoreUnknown = true)
    record GeminiRoutePlan(String summary, List<GeminiDay> days) {

        @JsonIgnoreProperties(ignoreUnknown = true)
        record GeminiDay(int dayIndex, List<GeminiPlace> places) {}

        @JsonIgnoreProperties(ignoreUnknown = true)
        record GeminiPlace(long id, String startTime, String endTime, String reason) {}
    }
}
