package back.backend.domain.place.service;

import back.backend.domain.admin.entity.ExternalApiProvider;
import back.backend.global.exception.BusinessException;
import back.backend.global.redis.RedisValueService;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.startsWith;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
class GoogleMapsQuotaGuardTest {

    @Mock RedisValueService redisValueService;

    private final Clock clock = Clock.fixed(
            Instant.parse("2026-08-13T00:00:00Z"), ZoneOffset.UTC);

    @Test
    @DisplayName("t1 분당 한도 이내의 Google Places 요청은 허용한다")
    void t1_placesWithinLimitIsAllowed() {
        GoogleMapsQuotaGuard guard = new GoogleMapsQuotaGuard(
                redisValueService, clock, 2, 3);
        given(redisValueService.increment(startsWith("google-maps-rate:google_places:"), any()))
                .willReturn(2L);

        assertThatCode(() -> guard.acquire(ExternalApiProvider.GOOGLE_PLACES))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("t2 분당 한도를 초과한 Google Routes 요청은 429로 차단한다")
    void t2_routesOverLimitIsRejected() {
        GoogleMapsQuotaGuard guard = new GoogleMapsQuotaGuard(
                redisValueService, clock, 2, 3);
        given(redisValueService.increment(startsWith("google-maps-rate:google_routes:"), any()))
                .willReturn(4L);

        assertThatThrownBy(() -> guard.acquire(ExternalApiProvider.GOOGLE_ROUTES))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("t3 Redis 장애가 발생하면 비용 보호를 위해 Google 호출을 차단한다")
    void t3_redisFailureFailsClosed() {
        GoogleMapsQuotaGuard guard = new GoogleMapsQuotaGuard(
                redisValueService, clock, 2, 3);
        given(redisValueService.increment(any(), any()))
                .willThrow(new IllegalStateException("redis down"));

        assertThatThrownBy(() -> guard.acquire(ExternalApiProvider.GOOGLE_PLACES))
                .isInstanceOf(BusinessException.class);
    }
}
