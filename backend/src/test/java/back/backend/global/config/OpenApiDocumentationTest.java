package back.backend.global.config;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Iterator;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class OpenApiDocumentationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("t1 핵심 API는 사용자 기능 중심의 태그와 이름으로 문서화한다")
    void t1_documentCoreApisWithBusinessNames() throws Exception {
        mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paths['/api/auth/login'].post.tags[0]").value("인증"))
                .andExpect(jsonPath("$.paths['/api/auth/login'].post.summary").value("이메일 로그인"))
                .andExpect(jsonPath("$.paths['/api/trips'].post.tags[0]").value("여행방"))
                .andExpect(jsonPath("$.paths['/api/trips'].post.summary").value("여행방 생성"))
                .andExpect(jsonPath("$.paths['/api/trips/{tripId}/places'].post.tags[0]").value("장소"))
                .andExpect(jsonPath("$.paths['/api/trips/{tripId}/places'].post.summary").value("여행방에 장소 등록"))
                .andExpect(jsonPath("$.paths['/api/trips/{tripId}/itinerary'].get.tags[0]").value("일정"))
                .andExpect(jsonPath("$.paths['/api/trips/{tripId}/itinerary'].get.summary").value("여행 일정 조회"));
    }

    @Test
    @DisplayName("t2 모든 서비스 API는 기능 이름과 도메인 태그를 제공한다")
    void t2_documentEveryServiceApiWithSummaryAndKnownTag() throws Exception {
        String content = mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        JsonNode paths = new ObjectMapper().readTree(content).path("paths");
        Set<String> knownTags = Set.of(
                "서비스 문의",
                "인증", "회원", "여행방", "여행방 초대", "장소",
                "장소 투표·댓글", "지도 핀 댓글", "일정", "AI 여행", "지출·정산",
                "여행 기록·회고", "여행 카드", "알림", "활동 로그", "관리자"
        );

        Iterator<Map.Entry<String, JsonNode>> pathEntries = paths.fields();
        while (pathEntries.hasNext()) {
            Map.Entry<String, JsonNode> pathEntry = pathEntries.next();
            if (!pathEntry.getKey().startsWith("/api/")) {
                continue;
            }
            Iterator<JsonNode> operations = pathEntry.getValue().elements();
            while (operations.hasNext()) {
                JsonNode operation = operations.next();
                org.assertj.core.api.Assertions.assertThat(operation.path("summary").asText())
                        .as("%s API 기능 이름", pathEntry.getKey())
                        .isNotBlank();
                org.assertj.core.api.Assertions.assertThat(operation.path("tags").get(0).asText())
                        .as("%s API 도메인 태그", pathEntry.getKey())
                        .isIn(knownTags);
            }
        }
    }
}
