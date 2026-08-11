package back.backend.global.config;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class PerformanceExternalApiGuardFilterTest {

    private final FilterChain filterChain = (request, response) ->
            ((MockHttpServletResponse) response).setStatus(204);

    @Test
    @DisplayName("t1 외부 API가 비활성화된 성능 테스트에서 Google 장소 검색을 차단한다")
    void t1_blocksGooglePlaceSearchWhenExternalApisAreDisabled() throws Exception {
        PerformanceExternalApiGuardFilter filter = new PerformanceExternalApiGuardFilter(false);
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/places/search");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, filterChain);

        assertThat(response.getStatus()).isEqualTo(503);
        assertThat(response.getContentAsString()).contains("외부 API 호출이 차단");
    }

    @Test
    @DisplayName("t2 외부 API가 비활성화되어도 일반 여행방 조회는 허용한다")
    void t2_allowsInternalTripReadWhenExternalApisAreDisabled() throws Exception {
        PerformanceExternalApiGuardFilter filter = new PerformanceExternalApiGuardFilter(false);
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/trips/1");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, filterChain);

        assertThat(response.getStatus()).isEqualTo(204);
    }

    @Test
    @DisplayName("t3 외부 API를 명시적으로 허용하면 AI 일정 경로를 통과시킨다")
    void t3_allowsAiRouteWhenExternalApisAreExplicitlyEnabled() throws Exception {
        PerformanceExternalApiGuardFilter filter = new PerformanceExternalApiGuardFilter(true);
        MockHttpServletRequest request = new MockHttpServletRequest(
                "POST", "/api/trips/1/itinerary/replan/preview");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, filterChain);

        assertThat(response.getStatus()).isEqualTo(204);
    }
}
