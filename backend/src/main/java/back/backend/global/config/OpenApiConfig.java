package back.backend.global.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.tags.Tag;
import java.util.List;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    private static final String SECURITY_SCHEME_NAME = "bearerAuth";

    @Bean
    public OpenAPI plamingoOpenApi() {
        SecurityScheme securityScheme = new SecurityScheme()
                .type(SecurityScheme.Type.HTTP)
                .scheme("bearer")
                .bearerFormat("JWT");

        return new OpenAPI()
                .info(new Info()
                        .title("Plamingo API")
                        .description("Plamingo 공동 여행지도 서비스 API")
                        .version("v1"))
                .tags(List.of(
                        new Tag().name("인증").description("회원가입, 로그인, 토큰 재발급 API"),
                        new Tag().name("회원").description("내 회원 정보 조회 및 관리 API"),
                        new Tag().name("여행방").description("여행방 생성, 조회, 수정 및 일정 후보 관리 API"),
                        new Tag().name("여행방 초대").description("초대 링크와 이메일 초대 API"),
                        new Tag().name("장소").description("장소 검색과 여행방 장소 관리 API"),
                        new Tag().name("장소 투표·댓글").description("후보 장소 투표와 의견 관리 API"),
                        new Tag().name("일정").description("여행 일정과 동선 계획 관리 API"),
                        new Tag().name("AI 여행").description("AI 장소 추천과 남은 일정 재배치 API"),
                        new Tag().name("지출·정산").description("여행 경비와 참여자별 정산 API"),
                        new Tag().name("여행 기록·회고").description("여행 기록, 사진 및 회고 관리 API"),
                        new Tag().name("여행 카드").description("완료 여행 카드 조회, 댓글 및 북마크 API"),
                        new Tag().name("알림").description("내 알림 조회 및 읽음 처리 API"),
                        new Tag().name("활동 로그").description("여행방 주요 변경 이력 조회 API")
                ))
                .components(new Components().addSecuritySchemes(SECURITY_SCHEME_NAME, securityScheme))
                .addSecurityItem(new SecurityRequirement().addList(SECURITY_SCHEME_NAME));
    }
}
