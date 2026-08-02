package back.backend.domain.itinerary.service;

import back.backend.domain.itinerary.entity.ItineraryDay;
import back.backend.domain.place.entity.TripPlace;
import back.backend.domain.place.service.PlaceStyleRelationService;
import back.backend.domain.trip.entity.TravelStyle;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

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
    private final PlaceStyleRelationService placeStyleRelationService;

    public Optional<Recommendation> recommend(
            List<ItineraryDay> itineraryDays,
            List<TripPlace> tripPlaces,
            Set<TravelStyle> travelStyles
    ) {
        return recommend(itineraryDays, tripPlaces, travelStyles, null);
    }

    public Optional<Recommendation> recommend(
            List<ItineraryDay> itineraryDays,
            List<TripPlace> tripPlaces,
            Set<TravelStyle> travelStyles,
            String planningMode
    ) {
        if (!openAiClient.isConfigured()
                || itineraryDays.isEmpty()
                || tripPlaces.isEmpty()
                || tripPlaces.size() > MAX_PLACE_COUNT) {
            return Optional.empty();
        }

        try {
            String responseJson = openAiClient.generateStructured(
                    buildPrompt(
                            itineraryDays,
                            tripPlaces,
                            travelStyles,
                            planningMode
                    ),
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
            Set<TravelStyle> travelStyles,
            String planningMode
    ) throws Exception {
        Map<String, Object> input = new LinkedHashMap<>();
        boolean replan = planningMode != null
                && planningMode.startsWith("REPLAN_REMAINING_ITINERARY");
        Map<Long, Double> resolvedScores =
                placeStyleRelationService.resolveCompatibilities(
                        tripPlaces,
                        travelStyles
                );
        Map<Long, Double> styleScores = resolvedScores == null
                ? Map.of() : resolvedScores;
        input.put("dayColumns", List.of(
                "id",
                "number",
                "date",
                "departureLat",
                "departureLng"
        ));
        input.put("dayRows", itineraryDays.stream()
                .map(this::dayContext)
                .toList());
        input.put("placeColumns", List.of(
                "id",
                "category",
                "styleScore",
                "latitude",
                "longitude"
        ));
        input.put("placeRows", tripPlaces.stream()
                .map(place -> placeContext(place, styleScores))
                .toList());
        input.put(
                "travelStyles",
                travelStyles.stream()
                        .map(Enum::name)
                        .sorted()
                        .toList()
        );
        input.put("planningMode", replan ? "REPLAN" : "INITIAL_PLAN");
        if (replan) {
            input.put("replanReason", planningMode.substring(
                    "REPLAN_REMAINING_ITINERARY".length()
            ).trim());
        }

        return """
                당신은 MySQL에서 검색된 여행 일정 컨텍스트를 근거로
                장소 배치 순서를 제안하는 도우미입니다.
                아래 JSON에 있는 Day와 장소만 사용하세요.
                dayRows와 placeRows는 각 columns 순서의 압축 행입니다.
                모든 장소 ID를 정확히 한 번씩 배치하고 새로운 ID를 만들지 마세요.
                가까운 장소를 같은 Day에 묶되 카테고리와 여행 스타일의 균형도 고려하세요.
                Day에 출발 좌표가 있으면 가까운 장소 묶음과 첫 방문지를 해당 Day에 우선 배치하세요.
                planningMode이 REPLAN이면 이미 지난 일정은 입력에서 제외된 상태이며,
                styleScore가 높은 장소 관계를 비슷한 동선 후보에서 우선하세요.
                응답의 dayPlaceIds는 dayRows와 같은 Day 순서를 사용하세요.
                장소명·주소·좌표·영업시간은 제공되지 않으므로 관련 사실을 추측하지 마세요.
                summary는 한국어 한두 문장으로 작성하세요.

                입력:
                """ + objectMapper.writeValueAsString(input);
    }

    private List<Object> dayContext(ItineraryDay day) {
        List<Object> context = new java.util.ArrayList<>();
        context.add(day.getId());
        context.add(day.getDayNumber());
        context.add(day.getItineraryDate().toString());
        context.add(day.hasDeparture() ? day.getDepartureLat() : null);
        context.add(day.hasDeparture() ? day.getDepartureLng() : null);
        return context;
    }

    private List<Object> placeContext(
            TripPlace place,
            Map<Long, Double> styleScores
    ) {
        return List.of(
                place.getId(),
                place.getCategory() == null
                        ? "" : place.getCategory().getCategoryType().name(),
                styleScores.getOrDefault(place.getId(), 0.0),
                place.getPlace().getLatitude(),
                place.getPlace().getLongitude()
        );
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
                || response.dayPlaceIds() == null
                || response.dayPlaceIds().size() != itineraryDays.size()) {
            return Optional.empty();
        }

        Set<Long> expectedPlaceIds = tripPlaces.stream()
                .map(TripPlace::getId)
                .collect(java.util.stream.Collectors.toSet());
        Set<Long> assignedPlaceIds = new java.util.HashSet<>();

        for (List<Long> placeIds : response.dayPlaceIds()) {
            if (placeIds == null) {
                return Optional.empty();
            }
            for (Long tripPlaceId : placeIds) {
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

        List<List<Long>> orderedIds = response.dayPlaceIds().stream()
                .map(List::copyOf)
                .toList();
        return Optional.of(new Recommendation(
                response.summary(),
                orderedIds
        ));
    }

    private static Map<String, Object> createResponseSchema() {
        Map<String, Object> dayPlacesSchema = Map.of(
                "type", "array",
                "items", Map.of("type", "integer")
        );
        return Map.of(
                "type", "object",
                "additionalProperties", false,
                "properties", Map.of(
                        "summary", Map.of("type", "string"),
                        "dayPlaceIds", Map.of(
                                "type", "array",
                                "items", dayPlacesSchema
                        )
                ),
                "required", List.of("summary", "dayPlaceIds")
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
            List<List<Long>> dayPlaceIds
    ) {
    }

}
