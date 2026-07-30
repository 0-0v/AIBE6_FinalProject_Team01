package back.backend.domain.itinerary.service;

import back.backend.domain.itinerary.entity.ItineraryDay;
import back.backend.domain.place.entity.TripPlace;
import back.backend.domain.trip.entity.TravelStyle;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

@Slf4j
@Component
@RequiredArgsConstructor
public class OpenAiRouteAdvisor {

    private static final int MAX_SUMMARY_LENGTH = 300;
    private static final int MAX_PLACE_COUNT = 60;
    private static final Map<String, Object> RESPONSE_SCHEMA =
            createResponseSchema();

    private final OpenAiClient openAiClient;
    private final ObjectMapper objectMapper;

    public Optional<Recommendation> recommend(
            List<ItineraryDay> itineraryDays,
            List<TripPlace> tripPlaces,
            Set<TravelStyle> travelStyles
    ) {
        if (!openAiClient.isConfigured()
                || itineraryDays.isEmpty()
                || tripPlaces.isEmpty()
                || tripPlaces.size() > MAX_PLACE_COUNT) {
            return Optional.empty();
        }

        try {
            String responseJson = openAiClient.generateStructured(
                    buildPrompt(itineraryDays, tripPlaces, travelStyles),
                    "itinerary_route_plan",
                    RESPONSE_SCHEMA
            );
            AiRouteResponse response = objectMapper.readValue(
                    responseJson,
                    AiRouteResponse.class
            );
            return validateAndConvert(
                    response,
                    itineraryDays,
                    tripPlaces
            );
        } catch (Exception exception) {
            log.warn(
                    "OpenAI 동선 추천을 사용할 수 없어 규칙 기반 추천으로 대체합니다. type={}",
                    exception.getClass().getSimpleName()
            );
            return Optional.empty();
        }
    }

    private String buildPrompt(
            List<ItineraryDay> itineraryDays,
            List<TripPlace> tripPlaces,
            Set<TravelStyle> travelStyles
    ) throws Exception {
        Map<String, Object> input = new LinkedHashMap<>();
        input.put(
                "days",
                itineraryDays.stream()
                        .map(day -> Map.of(
                                "dayId", day.getId(),
                                "dayNumber", day.getDayNumber(),
                                "date", day.getItineraryDate().toString()
                        ))
                        .toList()
        );
        input.put(
                "places",
                tripPlaces.stream()
                        .map(place -> Map.of(
                                "tripPlaceId", place.getId(),
                                "name", place.getPlace().getName(),
                                "category", place.getCategory().getName(),
                                "latitude", place.getPlace().getLatitude(),
                                "longitude", place.getPlace().getLongitude()
                        ))
                        .toList()
        );
        input.put(
                "travelStyles",
                travelStyles.stream()
                        .map(Enum::name)
                        .sorted()
                        .toList()
        );

        return """
                당신은 여행 일정의 장소 배치 순서를 제안하는 도우미입니다.
                아래 JSON에 있는 Day와 장소만 사용하세요.
                모든 tripPlaceId를 정확히 한 번씩 배치하고 새로운 ID를 만들지 마세요.
                가까운 장소를 같은 Day에 묶되 카테고리와 여행 스타일의 균형도 고려하세요.
                영업시간처럼 입력에 없는 사실은 추측하지 마세요.
                summary는 한국어 한두 문장으로 작성하세요.

                입력:
                """ + objectMapper.writeValueAsString(input);
    }

    private Optional<Recommendation> validateAndConvert(
            AiRouteResponse response,
            List<ItineraryDay> itineraryDays,
            List<TripPlace> tripPlaces
    ) {
        if (response == null
                || response.summary() == null
                || response.summary().isBlank()
                || response.summary().length() > MAX_SUMMARY_LENGTH
                || response.days() == null
                || response.days().size() != itineraryDays.size()) {
            return Optional.empty();
        }

        Set<Long> expectedDayIds = itineraryDays.stream()
                .map(ItineraryDay::getId)
                .collect(java.util.stream.Collectors.toSet());
        Set<Long> expectedPlaceIds = tripPlaces.stream()
                .map(TripPlace::getId)
                .collect(java.util.stream.Collectors.toSet());
        Map<Long, List<Long>> placeIdsByDay = new LinkedHashMap<>();
        Set<Long> assignedPlaceIds = new HashSet<>();

        for (AiRouteDay day : response.days()) {
            if (day == null
                    || day.dayId() == null
                    || day.tripPlaceIds() == null
                    || !expectedDayIds.contains(day.dayId())
                    || placeIdsByDay.putIfAbsent(
                            day.dayId(),
                            List.copyOf(day.tripPlaceIds())
                    ) != null) {
                return Optional.empty();
            }
            for (Long tripPlaceId : day.tripPlaceIds()) {
                if (tripPlaceId == null
                        || !expectedPlaceIds.contains(tripPlaceId)
                        || !assignedPlaceIds.add(tripPlaceId)) {
                    return Optional.empty();
                }
            }
        }

        if (!assignedPlaceIds.equals(expectedPlaceIds)) {
            return Optional.empty();
        }

        List<List<Long>> orderedIds = itineraryDays.stream()
                .map(day -> placeIdsByDay.getOrDefault(
                        day.getId(),
                        List.of()
                ))
                .toList();
        return Optional.of(new Recommendation(
                response.summary(),
                orderedIds
        ));
    }

    private static Map<String, Object> createResponseSchema() {
        Map<String, Object> daySchema = Map.of(
                "type", "object",
                "additionalProperties", false,
                "properties", Map.of(
                        "dayId", Map.of("type", "integer"),
                        "tripPlaceIds", Map.of(
                                "type", "array",
                                "items", Map.of("type", "integer")
                        )
                ),
                "required", List.of("dayId", "tripPlaceIds")
        );
        return Map.of(
                "type", "object",
                "additionalProperties", false,
                "properties", Map.of(
                        "summary", Map.of("type", "string"),
                        "days", Map.of(
                                "type", "array",
                                "items", daySchema
                        )
                ),
                "required", List.of("summary", "days")
        );
    }

    public record Recommendation(
            String summary,
            List<List<Long>> tripPlaceIdsByDay
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record AiRouteResponse(
            String summary,
            List<AiRouteDay> days
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record AiRouteDay(
            Long dayId,
            List<Long> tripPlaceIds
    ) {
    }

    // ── describe: 완성된 초안 → 날짜별 한 줄 설명 ──────────────────────────────

    private static final Map<String, Object> DESCRIBE_SCHEMA = createDescribeSchema();

    /**
     * 이미 완성된 초안(dayId → tripPlaceIds)을 받아 날짜별 한 줄 설명을 반환한다.
     * AI 미설정 또는 실패 → Optional.empty()
     */
    public Optional<Map<Long, String>> describe(
            Map<Long, List<Long>> draft,
            Set<TravelStyle> travelStyles
    ) {
        if (!openAiClient.isConfigured() || draft.isEmpty()) return Optional.empty();

        try {
            String prompt = buildDescribePrompt(draft, travelStyles);
            String responseJson = openAiClient.generateStructured(
                    prompt, "itinerary_descriptions", DESCRIBE_SCHEMA);
            DescribeResponse response = objectMapper.readValue(responseJson, DescribeResponse.class);
            if (response == null || response.days() == null) return Optional.empty();

            Map<Long, String> summaries = new java.util.LinkedHashMap<>();
            for (DescribeDay day : response.days()) {
                if (day.dayId() != null && day.summary() != null && !day.summary().isBlank()) {
                    summaries.put(day.dayId(), day.summary());
                }
            }
            return summaries.isEmpty() ? Optional.empty() : Optional.of(summaries);
        } catch (Exception e) {
            log.warn("AI 설명 생성 실패 — 설명 없이 진행합니다. type={}", e.getClass().getSimpleName());
            return Optional.empty();
        }
    }

    private String buildDescribePrompt(Map<Long, List<Long>> draft, Set<TravelStyle> travelStyles) {
        StringBuilder sb = new StringBuilder();
        sb.append("아래는 여행 일정 초안입니다. 각 날에 한국어 한 문장 설명을 붙여주세요.\n");
        if (!travelStyles.isEmpty()) {
            String styles = travelStyles.stream().map(Enum::name).sorted()
                    .collect(java.util.stream.Collectors.joining(", "));
            sb.append("여행 스타일: ").append(styles).append("\n");
        }
        sb.append("일정:\n");
        draft.forEach((dayId, placeIds) ->
                sb.append("Day ").append(dayId).append(": 장소 ID ").append(placeIds).append("\n")
        );
        return sb.toString();
    }

    private static Map<String, Object> createDescribeSchema() {
        Map<String, Object> daySchema = Map.of(
                "type", "object",
                "additionalProperties", false,
                "properties", Map.of(
                        "dayId",   Map.of("type", "integer"),
                        "summary", Map.of("type", "string")
                ),
                "required", List.of("dayId", "summary")
        );
        return Map.of(
                "type", "object",
                "additionalProperties", false,
                "properties", Map.of(
                        "days", Map.of("type", "array", "items", daySchema)
                ),
                "required", List.of("days")
        );
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record DescribeResponse(List<DescribeDay> days) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record DescribeDay(Long dayId, String summary) {}
}
