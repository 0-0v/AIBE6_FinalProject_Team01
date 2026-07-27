package back.backend.domain.itinerary.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.ObjectMapper;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class GeminiClientTest {

    @Test
    @DisplayName("t1 RestClient Builder 빈 없이 Gemini 클라이언트를 생성한다")
    void t1_createsClientWithoutRestClientBuilderBean() {
        GeminiClient client = new GeminiClient(
                "",
                "https://generativelanguage.googleapis.com",
                "gemini-2.0-flash",
                Duration.ofSeconds(3),
                Duration.ofSeconds(30),
                new ObjectMapper()
        );

        assertThat(client.isConfigured()).isFalse();
    }

    @Test
    @DisplayName("t2 Gemini API 키는 URL이 아닌 헤더로 전달한다")
    void t2_sendsApiKeyInHeader() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        GeminiClient client = new GeminiClient(
                builder,
                "secret-key",
                "https://generativelanguage.googleapis.com",
                "gemini-test",
                new ObjectMapper()
        );
        server.expect(requestTo(
                        "https://generativelanguage.googleapis.com/v1beta/models/gemini-test:generateContent"
                ))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("X-Goog-Api-Key", "secret-key"))
                .andRespond(withSuccess(
                        """
                        {"candidates":[{"content":{"parts":[{"text":"{}"}]}}]}
                        """,
                        MediaType.APPLICATION_JSON
                ));

        assertThat(client.generateContent("test")).isEqualTo("{}");
        server.verify();
    }
}
