package back.backend.domain.agent.service;

import back.backend.domain.itinerary.service.OpenAiClient;
import back.backend.domain.place.dto.response.PlaceSearchResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Component
@RequiredArgsConstructor
public class AiPlaceRecommendationRanker {

    private static final Map<String, Object> RESPONSE_SCHEMA = Map.of(
            "type", "object",
            "properties", Map.of(
                    "assessments", Map.of(
                            "type", "array",
                            "items", Map.of(
                                    "type", "object",
                                    "properties", Map.of(
                                            "placeId", Map.of("type", "string"),
                                            "score", Map.of("type", "number"),
                                            "reason", Map.of("type", "string")
                                    ),
                                    "required", List.of("placeId", "score", "reason"),
                                    "additionalProperties", false
                            )
                    )
            ),
            "required", List.of("assessments"),
            "additionalProperties", false
    );

    private final OpenAiClient openAiClient;
    private final ObjectMapper objectMapper;

    public Map<String, Assessment> rank(
            String destination,
            String category,
            String userPreference,
            List<PlaceSearchResponse> candidates
    ) {
        if (!openAiClient.isConfigured() || candidates.isEmpty()) return Map.of();
        try {
            String response = openAiClient.generateStructured(
                    buildPrompt(destination, category, userPreference, candidates),
                    "place_recommendation_ranking",
                    RESPONSE_SCHEMA
            );
            return parse(response, candidates);
        } catch (Exception exception) {
            log.warn("장소 추천 LLM 재정렬 실패. 규칙 기반 점수를 사용합니다. type={}",
                    exception.getClass().getSimpleName());
            return Map.of();
        }
    }

    private String buildPrompt(
            String destination,
            String category,
            String userPreference,
            List<PlaceSearchResponse> candidates
    ) throws Exception {
        Map<String, Object> input = new LinkedHashMap<>();
        input.put("destination", destination == null ? "" : destination);
        input.put("requiredCategory", category);
        input.put("userPreference", userPreference == null ? "" : userPreference.trim());
        input.put("candidateColumns", List.of(
                "placeId", "name", "address", "category", "googleTypes", "rating", "reviewCount"
        ));
        input.put("candidateRows", candidates.stream().map(place -> List.of(
                safe(place.googlePlaceId()),
                safe(place.name()),
                safe(place.address()),
                place.recommendedCategoryType() == null
                        ? "OTHER" : place.recommendedCategoryType().name(),
                place.placeTypes() == null ? List.of() : place.placeTypes(),
                place.rating() == null ? 0 : place.rating(),
                place.userRatingCount() == null ? 0 : place.userRatingCount()
        )).toList());
        return """
                여행 장소 추천 후보를 사용자 조건에 맞게 재정렬하세요.
                제공된 후보와 정보만 사용하고 장소를 추가하거나 사실을 추측하지 마세요.
                requiredCategory와 다른 후보는 낮게 평가하세요.
                userPreference가 비어 있지 않으면 이름·주소·Google 유형·평점에서 근거가 확인되는 범위에서만 반영하세요.
                각 후보를 빠짐없이 반환하고 score는 0부터 1 사이 숫자로 작성하세요.
                reason은 확인 가능한 근거만 사용한 짧은 한국어 한 문장으로 작성하세요.

                입력:
                """ + objectMapper.writeValueAsString(input);
    }

    private Map<String, Assessment> parse(
            String response,
            List<PlaceSearchResponse> candidates
    ) throws Exception {
        Set<String> candidateIds = candidates.stream()
                .map(PlaceSearchResponse::googlePlaceId)
                .collect(Collectors.toSet());
        JsonNode assessments = objectMapper.readTree(response).get("assessments");
        if (assessments == null || !assessments.isArray()) return Map.of();
        Map<String, Assessment> result = new LinkedHashMap<>();
        assessments.forEach(node -> {
            String placeId = node.path("placeId").asText();
            if (!candidateIds.contains(placeId) || result.containsKey(placeId)) return;
            double score = Math.max(0, Math.min(1, node.path("score").asDouble()));
            String reason = node.path("reason").asText().trim();
            result.put(placeId, new Assessment(score, reason));
        });
        return Map.copyOf(result);
    }

    private String safe(String value) {
        return value == null ? "" : value;
    }

    public record Assessment(double score, String reason) {
    }
}
