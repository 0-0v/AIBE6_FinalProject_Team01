package back.backend.global.security;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.access.AccessDeniedException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

class JwtAccessDeniedHandlerTest {

    private final ObjectMapper objectMapper = JsonMapper.builder().build();
    private final JwtAccessDeniedHandler accessDeniedHandler = new JwtAccessDeniedHandler(objectMapper);

    @Test
    @DisplayName("t1 권한이 없는 요청은 403 상태코드와 공통 에러 응답 형식을 반환한다")
    void t1_handleWritesForbiddenErrorResponse() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("DELETE", "/api/trips/1");
        MockHttpServletResponse response = new MockHttpServletResponse();

        accessDeniedHandler.handle(request, response, new AccessDeniedException("no permission"));

        assertThat(response.getStatus()).isEqualTo(HttpStatus.FORBIDDEN.value());
        assertThat(response.getContentType()).startsWith(MediaType.APPLICATION_JSON_VALUE);
        JsonNode body = objectMapper.readTree(response.getContentAsString());
        assertThat(body.get("status").asInt()).isEqualTo(403);
        assertThat(body.get("code").asText()).isEqualTo("COMMON_403");
        assertThat(body.get("path").asText()).isEqualTo("/api/trips/1");
    }
}
