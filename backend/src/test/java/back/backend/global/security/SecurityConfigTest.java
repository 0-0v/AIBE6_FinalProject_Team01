package back.backend.global.security;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.mock.web.MockHttpServletRequest;

class SecurityConfigTest {

    @Test
    @DisplayName("t1 설정한 Origin의 CORS 요청은 자격 증명과 주요 HTTP 메서드를 허용한다")
    void t1_configuredOriginAllowsCredentialsAndHttpMethods() {
        CorsProperties properties = new CorsProperties();
        properties.setAllowedOrigins(List.of("https://pramingo.example"));
        CorsConfigurationSource source = new SecurityConfig().corsConfigurationSource(properties);
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/trips");

        CorsConfiguration configuration = source.getCorsConfiguration(request);

        assertThat(configuration).isNotNull();
        assertThat(configuration.getAllowedOrigins()).containsExactly("https://pramingo.example");
        assertThat(configuration.getAllowedMethods()).contains("GET", "POST", "PATCH", "DELETE");
        assertThat(configuration.getAllowCredentials()).isTrue();
    }
}
