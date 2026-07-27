package back.backend.domain.itinerary.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.ObjectMapper;

import java.util.List;

@Slf4j
@Component
public class GeminiClient {

    private final RestClient restClient;
    private final String apiKey;
    private final String model;
    private final ObjectMapper objectMapper;

    public GeminiClient(
            @Value("${app.integrations.ai.api-key:}") String apiKey,
            @Value("${app.integrations.ai.base-url:https://generativelanguage.googleapis.com}") String baseUrl,
            @Value("${app.integrations.ai.model:gemini-2.0-flash}") String model,
            ObjectMapper objectMapper
    ) {
        this.apiKey = apiKey;
        this.model = model;
        this.objectMapper = objectMapper;
        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .build();
    }

    public boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank();
    }

    /**
     * Gemini에 프롬프트를 전송하고 응답 텍스트를 반환합니다.
     * responseMimeType을 application/json으로 설정하면 Gemini가 JSON만 반환합니다.
     */
    public String generateContent(String prompt) {
        if (!isConfigured()) {
            throw new IllegalStateException("AI API key(AI_API_KEY)가 설정되지 않았습니다.");
        }
        try {
            GeminiRequest request = new GeminiRequest(
                    List.of(new GeminiRequest.Content(List.of(new GeminiRequest.Part(prompt)))),
                    new GeminiRequest.GenerationConfig("application/json", 0.2)
            );
            String requestBody = objectMapper.writeValueAsString(request);

            GeminiApiResponse response = restClient.post()
                    .uri("/v1beta/models/{model}:generateContent?key={key}", model, apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestBody)
                    .retrieve()
                    .body(GeminiApiResponse.class);

            if (response == null
                    || response.candidates() == null
                    || response.candidates().isEmpty()) {
                throw new RuntimeException("Gemini가 빈 응답을 반환했습니다.");
            }

            Candidate candidate = response.candidates().get(0);
            if (candidate.content() == null
                    || candidate.content().parts() == null
                    || candidate.content().parts().isEmpty()) {
                throw new RuntimeException("Gemini 응답에 content가 없습니다.");
            }

            return candidate.content().parts().get(0).text();

        } catch (IllegalStateException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Gemini API 호출 실패: " + e.getMessage(), e);
        }
    }

    // ── 요청 DTO ───────────────────────────────────────────────────────────────

    record GeminiRequest(
            List<Content> contents,
            GenerationConfig generationConfig
    ) {
        record Content(List<Part> parts) {}
        record Part(String text) {}
        record GenerationConfig(String responseMimeType, double temperature) {}
    }

    // ── 응답 DTO ───────────────────────────────────────────────────────────────

    record GeminiApiResponse(List<Candidate> candidates) {}

    record Candidate(CandidateContent content) {}

    record CandidateContent(List<CandidatePart> parts) {}

    record CandidatePart(String text) {}
}
