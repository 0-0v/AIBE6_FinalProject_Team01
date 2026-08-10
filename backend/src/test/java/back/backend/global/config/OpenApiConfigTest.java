package back.backend.global.config;

import static org.assertj.core.api.Assertions.assertThat;

import io.swagger.v3.oas.models.OpenAPI;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class OpenApiConfigTest {

    @Test
    @DisplayName("t1 Swagger 문서는 API 기본 정보와 JWT Bearer 인증 스키마를 포함한다")
    void t1_createOpenApiWithJwtSecurityScheme() {
        OpenAPI openApi = new OpenApiConfig().plamingoOpenApi();

        assertThat(openApi.getInfo().getTitle()).isEqualTo("Plamingo API");
        assertThat(openApi.getComponents().getSecuritySchemes()).containsKey("bearerAuth");
        assertThat(openApi.getComponents().getSecuritySchemes().get("bearerAuth").getScheme())
                .isEqualTo("bearer");
    }

    @Test
    @DisplayName("t2 Swagger 문서는 핵심 사용자 흐름 순서로 API 태그를 제공한다")
    void t2_createOpenApiWithOrderedBusinessTags() {
        OpenAPI openApi = new OpenApiConfig().plamingoOpenApi();

        assertThat(openApi.getTags())
                .extracting(tag -> tag.getName())
                .containsExactly(
                        "인증", "회원", "여행방", "여행방 초대", "장소",
                        "장소 투표·댓글", "일정", "AI 여행", "지출·정산",
                        "여행 기록·회고", "여행 카드", "알림", "활동 로그"
                );
    }
}
