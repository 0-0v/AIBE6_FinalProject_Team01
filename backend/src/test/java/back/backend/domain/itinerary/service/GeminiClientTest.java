package back.backend.domain.itinerary.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;

import static org.assertj.core.api.Assertions.assertThat;

class GeminiClientTest {

    @Test
    @DisplayName("t1 RestClient Builder 빈 없이 Gemini 클라이언트를 생성한다")
    void t1_createsClientWithoutRestClientBuilderBean() {
        GeminiClient client = new GeminiClient(
                "",
                "https://generativelanguage.googleapis.com",
                "gemini-2.0-flash",
                new ObjectMapper()
        );

        assertThat(client.isConfigured()).isFalse();
    }
}
