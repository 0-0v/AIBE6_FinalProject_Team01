package back.backend.domain.itinerary.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.ObjectMapper;
import back.backend.domain.admin.entity.ExternalApiProvider;
import back.backend.domain.admin.service.ExternalApiUsageService;

import java.time.Duration;
import java.util.List;
import java.util.Map;

@Slf4j
@Component
public class OpenAiClient {

    private static final int MAX_OUTPUT_TOKENS = 3_000;

    private final RestClient restClient;
    private final String apiKey;
    private final String model;
    private final ObjectMapper objectMapper;
    private ExternalApiUsageService usageService;

    @Autowired
    void setUsageService(ExternalApiUsageService usageService) {
        this.usageService = usageService;
    }

    @Autowired
    public OpenAiClient(
            @Value("${app.integrations.openai.api-key:}") String apiKey,
            @Value("${app.integrations.openai.base-url:https://api.openai.com}") String baseUrl,
            @Value("${app.integrations.openai.model:gpt-5-nano}") String model,
            @Value("${app.integrations.openai.connect-timeout:3s}") Duration connectTimeout,
            @Value("${app.integrations.openai.read-timeout:30s}") Duration readTimeout,
            ObjectMapper objectMapper
    ) {
        this(
                createRestClientBuilder(connectTimeout, readTimeout),
                apiKey,
                baseUrl,
                model,
                objectMapper
        );
    }

    OpenAiClient(
            RestClient.Builder builder,
            String apiKey,
            String baseUrl,
            String model,
            ObjectMapper objectMapper
    ) {
        this.apiKey = apiKey;
        this.model = model;
        this.objectMapper = objectMapper;
        this.restClient = builder.baseUrl(baseUrl).build();
    }

    public boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank();
    }

    public String generateStructured(
            String prompt,
            String schemaName,
            Map<String, Object> schema
    ) {
        if (!isConfigured()) {
            throw new IllegalStateException(
                    "OpenAI API key(OPENAI_API_KEY)가 설정되지 않았습니다."
            );
        }

        try {
            OpenAiRequest request = new OpenAiRequest(
                    model,
                    prompt,
                    false,
                    MAX_OUTPUT_TOKENS,
                    new Reasoning("low"),
                    new TextConfig(new JsonSchemaFormat(
                            "json_schema",
                            schemaName,
                            true,
                            schema
                    ))
            );
            OpenAiResponse response = restClient.post()
                    .uri("/v1/responses")
                    .header(
                            HttpHeaders.AUTHORIZATION,
                            "Bearer " + apiKey
                    )
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(objectMapper.writeValueAsString(request))
                    .retrieve()
                    .body(OpenAiResponse.class);
            String output = extractOutputText(response);
            recordUsage(true, response.usage());
            return output;
        } catch (IllegalStateException | OpenAiRequestException exception) {
            recordUsage(false, null);
            throw exception;
        } catch (Exception exception) {
            recordUsage(false, null);
            throw new OpenAiRequestException(
                    "OpenAI API 호출에 실패했습니다.",
                    exception
            );
        }
    }

    private void recordUsage(boolean success, Usage usage) {
        if (usageService == null) return;
        usageService.recordSafely(ExternalApiProvider.OPENAI, "RESPONSES", success,
                usage == null ? null : usage.inputTokens(),
                usage == null ? null : usage.outputTokens());
    }

    private String extractOutputText(OpenAiResponse response) {
        if (response == null || response.output() == null) {
            throw new OpenAiRequestException(
                    "OpenAI 응답에 출력 텍스트가 없습니다."
            );
        }
        return response.output().stream()
                .filter(output -> output.content() != null)
                .flatMap(output -> output.content().stream())
                .filter(content -> "output_text".equals(content.type()))
                .map(OutputContent::text)
                .filter(text -> text != null && !text.isBlank())
                .findFirst()
                .orElseThrow(() -> new OpenAiRequestException(
                        "OpenAI 응답에 출력 텍스트가 없습니다."
                ));
    }

    private static RestClient.Builder createRestClientBuilder(
            Duration connectTimeout,
            Duration readTimeout
    ) {
        SimpleClientHttpRequestFactory requestFactory =
                new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(connectTimeout);
        requestFactory.setReadTimeout(readTimeout);
        return RestClient.builder().requestFactory(requestFactory);
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    private record OpenAiRequest(
            String model,
            String input,
            boolean store,
            @JsonProperty("max_output_tokens")
            int maxOutputTokens,
            Reasoning reasoning,
            TextConfig text
    ) {
    }

    private record Reasoning(String effort) {
    }

    private record TextConfig(JsonSchemaFormat format) {
    }

    private record JsonSchemaFormat(
            String type,
            String name,
            boolean strict,
            Map<String, Object> schema
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record OpenAiResponse(List<Output> output, Usage usage) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record Usage(
            @JsonProperty("input_tokens") Integer inputTokens,
            @JsonProperty("output_tokens") Integer outputTokens
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record Output(String type, List<OutputContent> content) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record OutputContent(String type, String text) {
    }

    static class OpenAiRequestException extends RuntimeException {

        OpenAiRequestException(String message) {
            super(message);
        }

        OpenAiRequestException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
