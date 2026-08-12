package back.backend.domain.place.service;

import back.backend.domain.itinerary.service.OpenAiClient;
import back.backend.domain.place.entity.Place;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Slf4j
@Service
@RequiredArgsConstructor
public class PlaceVoteAiInfoService {

    private final OpenAiClient openAiClient;
    private final ObjectMapper objectMapper;

    public VoteAiInfo generate(Place primary, Place secondary) {
        if (!openAiClient.isConfigured()) return fallback(primary, secondary);
        try {
            String prompt = """
                    여행 장소 투표에 표시할 짧고 사실적인 한국어 정보를 작성해줘.
                    추측은 피하고 제공된 이름, 주소, 유형, 영업시간만 사용해.
                    각 장소 설명은 어떤 곳인지, 방문하기 좋은 때, 특징이나 주의점을 2~3문장으로 작성해.
                    A/B 투표라면 비교 요약도 2문장 이내로 작성해.
                    A: %s / %s / %s / %s
                    B: %s
                    """.formatted(
                    primary.getName(), primary.getAddress(), primary.getPlaceType(), primary.getOpeningHoursJson(),
                    secondary == null ? "없음" : String.join(" / ", List.of(
                            safe(secondary.getName()), safe(secondary.getAddress()), safe(secondary.getPlaceType()),
                            safe(secondary.getOpeningHoursJson()))));
            Map<String, Object> string = Map.of("type", "string");
            Map<String, Object> schema = Map.of(
                    "type", "object",
                    "properties", Map.of(
                            "primaryDescription", string,
                            "secondaryDescription", string,
                            "comparisonSummary", string),
                    "required", List.of("primaryDescription", "secondaryDescription", "comparisonSummary"),
                    "additionalProperties", false);
            JsonNode json = objectMapper.readTree(openAiClient.generateStructured(prompt, "place_vote_info", schema));
            return new VoteAiInfo(
                    text(json, "primaryDescription", fallbackDescription(primary)),
                    secondary == null ? null : text(json, "secondaryDescription", fallbackDescription(secondary)),
                    secondary == null ? null : text(json, "comparisonSummary", null));
        } catch (Exception exception) {
            log.warn("장소 투표 AI 정보 생성 실패. 기본 정보로 투표를 생성합니다.", exception);
            return fallback(primary, secondary);
        }
    }

    private VoteAiInfo fallback(Place primary, Place secondary) {
        return new VoteAiInfo(
                fallbackDescription(primary),
                secondary == null ? null : fallbackDescription(secondary),
                null);
    }

    private String fallbackDescription(Place place) {
        String type = place.getPlaceType() == null || place.getPlaceType().isBlank()
                ? "여행 장소" : place.getPlaceType();
        String address = place.getAddress() == null || place.getAddress().isBlank()
                ? "주소 정보 없음" : place.getAddress();
        return "%s · %s".formatted(type, address);
    }

    private String text(JsonNode json, String field, String fallback) {
        JsonNode value = json.get(field);
        return value == null || value.asText().isBlank() ? fallback : value.asText();
    }

    private static String safe(String value) {
        return value == null ? "정보 없음" : value;
    }

    public record VoteAiInfo(String primaryDescription, String secondaryDescription, String comparisonSummary) {}
}
