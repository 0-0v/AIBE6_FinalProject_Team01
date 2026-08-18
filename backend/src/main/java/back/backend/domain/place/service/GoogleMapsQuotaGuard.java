package back.backend.domain.place.service;

import back.backend.domain.admin.entity.ExternalApiProvider;
import back.backend.domain.place.exception.PlaceErrorCode;
import back.backend.global.exception.BusinessException;
import back.backend.global.redis.RedisKeyFactory;
import back.backend.global.redis.RedisValueService;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class GoogleMapsQuotaGuard {

    private static final Duration WINDOW = Duration.ofMinutes(1);

    private final RedisValueService redisValueService;
    private final Clock clock;
    private final long placesRequestsPerMinute;
    private final long routesRequestsPerMinute;

    public GoogleMapsQuotaGuard(
            RedisValueService redisValueService,
            Clock clock,
            @Value("${app.integrations.google-maps.places-requests-per-minute:300}")
            long placesRequestsPerMinute,
            @Value("${app.integrations.google-maps.routes-requests-per-minute:300}")
            long routesRequestsPerMinute
    ) {
        this.redisValueService = redisValueService;
        this.clock = clock;
        this.placesRequestsPerMinute = placesRequestsPerMinute;
        this.routesRequestsPerMinute = routesRequestsPerMinute;
    }

    public void acquire(ExternalApiProvider provider) {
        long limit = switch (provider) {
            case GOOGLE_PLACES -> placesRequestsPerMinute;
            case GOOGLE_ROUTES -> routesRequestsPerMinute;
            default -> throw new IllegalArgumentException("Google Maps provider가 아닙니다.");
        };
        if (limit <= 0) {
            throw new BusinessException(PlaceErrorCode.GOOGLE_MAPS_RATE_LIMITED);
        }
        long minute = Instant.now(clock).getEpochSecond() / 60;
        String key = RedisKeyFactory.create(
                "google-maps-rate",
                provider.name().toLowerCase(),
                minute
        );
        try {
            if (redisValueService.increment(key, WINDOW.plusSeconds(5)) > limit) {
                throw new BusinessException(PlaceErrorCode.GOOGLE_MAPS_RATE_LIMITED);
            }
        } catch (BusinessException exception) {
            throw exception;
        } catch (RuntimeException exception) {
            throw new BusinessException(PlaceErrorCode.GOOGLE_MAPS_RATE_LIMITED);
        }
    }
}
