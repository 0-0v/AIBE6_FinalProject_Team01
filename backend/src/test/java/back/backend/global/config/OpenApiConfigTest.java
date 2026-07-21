package back.backend.global.config;

import static org.assertj.core.api.Assertions.assertThat;

import io.swagger.v3.oas.models.OpenAPI;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class OpenApiConfigTest {

    @Test
    @DisplayName("t1 Swagger 문서에 API 기본 정보와 JWT Bearer 인증 스키마를 포함한다")
    void t1_createOpenApiWithJwtSecurityScheme() {
        OpenAPI openApi = new OpenApiConfig().plamingoOpenApi();

        assertThat(openApi.getInfo().getTitle()).isEqualTo("Plamingo API");
        assertThat(openApi.getComponents().getSecuritySchemes()).containsKey("bearerAuth");
        assertThat(openApi.getComponents().getSecuritySchemes().get("bearerAuth").getScheme())
                .isEqualTo("bearer");
    }
}
