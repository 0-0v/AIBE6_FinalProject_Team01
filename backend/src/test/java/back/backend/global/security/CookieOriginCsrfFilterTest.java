package back.backend.global.security;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class CookieOriginCsrfFilterTest {

    private final CookieOriginCsrfFilter filter =
            new CookieOriginCsrfFilter(allowedOrigins());

    @Test
    @DisplayName("t1 허용된 Origin의 토큰 재발급 요청은 통과한다")
    void t1_allowsReissueFromConfiguredOrigin() throws Exception {
        MockHttpServletRequest request = post("/api/auth/reissue");
        request.addHeader("Origin", "https://plamingo.example");
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, new MockHttpServletResponse(), chain);

        assertThat(chain.getRequest()).isSameAs(request);
    }

    @Test
    @DisplayName("t2 허용되지 않은 Origin의 토큰 재발급 요청은 403으로 차단한다")
    void t2_blocksReissueFromUntrustedOrigin() throws Exception {
        MockHttpServletRequest request = post("/api/auth/reissue");
        request.addHeader("Origin", "https://attacker.example");
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, response, chain);

        assertThat(chain.getRequest()).isNull();
        assertThat(response.getStatus()).isEqualTo(403);
        assertThat(response.getContentAsString()).contains("COMMON_403");
    }

    @Test
    @DisplayName("t3 허용되지 않은 Origin의 로그아웃 요청은 403으로 차단한다")
    void t3_blocksLogoutFromUntrustedOrigin() throws Exception {
        MockHttpServletRequest request = post("/api/auth/logout");
        request.addHeader("Origin", "https://attacker.example");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertThat(response.getStatus()).isEqualTo(403);
    }

    @Test
    @DisplayName("t4 Origin이 없는 서버 간 토큰 재발급 요청은 기존 호환성을 위해 통과한다")
    void t4_allowsReissueWithoutOriginForNonBrowserClients() throws Exception {
        MockHttpServletRequest request = post("/api/auth/reissue");
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, new MockHttpServletResponse(), chain);

        assertThat(chain.getRequest()).isSameAs(request);
    }

    @Test
    @DisplayName("t5 보호 대상이 아닌 요청은 Origin과 관계없이 통과한다")
    void t5_ignoresNonCookieAuthenticationEndpoint() throws Exception {
        MockHttpServletRequest request = post("/api/auth/login");
        request.addHeader("Origin", "https://attacker.example");
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, new MockHttpServletResponse(), chain);

        assertThat(chain.getRequest()).isSameAs(request);
    }

    private List<String> allowedOrigins() {
        return List.of("https://plamingo.example");
    }

    private MockHttpServletRequest post(String path) {
        return new MockHttpServletRequest("POST", path);
    }
}
