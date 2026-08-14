package back.backend.global.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.env.YamlPropertySourceLoader;
import org.springframework.core.io.ClassPathResource;

class SwaggerReadOnlyConfigurationTest {

    @Test
    @DisplayName("t1 Swagger UI는 문서 조회만 허용하고 API 실행 버튼을 비활성화한다")
    void t1_swaggerUiDisablesSubmitMethods() throws IOException {
        var sources = new YamlPropertySourceLoader().load(
                "application",
                new ClassPathResource("application.yml")
        );

        assertThat(sources.getFirst().getProperty("springdoc.swagger-ui.supported-submit-methods"))
                .isEqualTo("");
    }
}
