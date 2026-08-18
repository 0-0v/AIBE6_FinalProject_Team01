package back.backend.global.config;

import back.backend.global.redis.RedisValueService;
import java.time.Duration;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

class GoogleMapsPublicApiRateLimitFilterTest {

    private final RedisValueService redisValueService = mock(RedisValueService.class);

    @Test
    @DisplayName("t1 공개 Google 사진 API가 IP별 분당 한도 이내면 허용한다")
    void t1_allowsPublicPhotoRequestWithinIpLimit() throws Exception {
        GoogleMapsPublicApiRateLimitFilter filter =
                new GoogleMapsPublicApiRateLimitFilter(redisValueService, 2);
        given(redisValueService.increment(anyString(), eq(Duration.ofSeconds(65))))
                .willReturn(2L);
        MockHttpServletRequest request = request("/api/places/photo");
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, response, chain);

        assertThat(chain.getRequest()).isSameAs(request);
    }

    @Test
    @DisplayName("t2 공개 Google 사진 API가 IP별 분당 한도를 넘으면 429로 차단한다")
    void t2_blocksPublicPhotoRequestOverIpLimit() throws Exception {
        GoogleMapsPublicApiRateLimitFilter filter =
                new GoogleMapsPublicApiRateLimitFilter(redisValueService, 2);
        given(redisValueService.increment(anyString(), eq(Duration.ofSeconds(65))))
                .willReturn(3L);
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request("/api/places/photo/metadata"), response, new MockFilterChain());

        assertThat(response.getStatus()).isEqualTo(429);
        assertThat(response.getContentAsString()).contains("요청이 너무 많습니다");
    }

    @Test
    @DisplayName("t3 Google 호출이 없는 일반 API는 IP 제한 카운터를 사용하지 않는다")
    void t3_ignoresNonGooglePublicApi() throws Exception {
        GoogleMapsPublicApiRateLimitFilter filter =
                new GoogleMapsPublicApiRateLimitFilter(redisValueService, 2);
        MockHttpServletRequest request = request("/api/places/search");
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, new MockHttpServletResponse(), chain);

        assertThat(chain.getRequest()).isSameAs(request);
    }

    private MockHttpServletRequest request(String path) {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", path);
        request.setRemoteAddr("203.0.113.10");
        return request;
    }
}
