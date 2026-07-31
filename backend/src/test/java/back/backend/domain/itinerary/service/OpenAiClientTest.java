package back.backend.domain.itinerary.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.ObjectMapper;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.http.HttpMethod.POST;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class OpenAiClientTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    @DisplayName("t1 API 키가 없으면 OpenAI 클라이언트가 미설정 상태다")
    void t1_missingApiKeyMarksClientUnconfigured() {
        OpenAiClient client = new OpenAiClient(
                RestClient.builder(),
                "",
                "https://api.openai.com",
                "gpt-5-nano",
                objectMapper
        );

        assertThat(client.isConfigured()).isFalse();
        assertThatThrownBy(() -> client.generateStructured(
                "prompt",
                "route_plan",
                Map.of("type", "object")
        ))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("OPENAI_API_KEY");
    }

    @Test
    @DisplayName("t2 Responses API에 Bearer 인증과 JSON Schema를 전달한다")
    void t2_generateStructuredUsesResponsesApiAndJsonSchema() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        OpenAiClient client = new OpenAiClient(
                builder,
                "test-openai-key",
                "https://api.openai.com",
                "gpt-5-nano",
                objectMapper
        );
        server.expect(once(), requestTo("https://api.openai.com/v1/responses"))
                .andExpect(method(POST))
                .andExpect(header(
                        HttpHeaders.AUTHORIZATION,
                        "Bearer test-openai-key"
                ))
                .andExpect(jsonPath("$.model").value("gpt-5-nano"))
                .andExpect(jsonPath("$.store").value(false))
                .andExpect(jsonPath("$.max_output_tokens").value(3000))
                .andExpect(jsonPath("$.text.format.type").value("json_schema"))
                .andExpect(jsonPath("$.text.format.name").value("route_plan"))
                .andExpect(jsonPath("$.text.format.strict").value(true))
                .andRespond(withSuccess("""
                        {
                          "output": [{
                            "type": "message",
                            "content": [{
                              "type": "output_text",
                              "text": "{\\"summary\\":\\"추천\\"}"
                            }]
                          }]
                        }
                        """, org.springframework.http.MediaType.APPLICATION_JSON));

        String result = client.generateStructured(
                "prompt",
                "route_plan",
                Map.of(
                        "type", "object",
                        "additionalProperties", false
                )
        );

        assertThat(result).isEqualTo("{\"summary\":\"추천\"}");
        server.verify();
    }

    @Test
    @DisplayName("t3 출력 텍스트가 없는 응답은 실패로 처리한다")
    void t3_missingOutputTextFails() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        OpenAiClient client = new OpenAiClient(
                builder,
                "test-openai-key",
                "https://api.openai.com",
                "gpt-5-nano",
                objectMapper
        );
        server.expect(requestTo("https://api.openai.com/v1/responses"))
                .andRespond(withSuccess(
                        "{\"output\":[]}",
                        org.springframework.http.MediaType.APPLICATION_JSON
                ));

        assertThatThrownBy(() -> client.generateStructured(
                "prompt",
                "route_plan",
                Map.of("type", "object")
        ))
                .isInstanceOf(OpenAiClient.OpenAiRequestException.class)
                .hasMessageContaining("출력 텍스트");
    }
}
