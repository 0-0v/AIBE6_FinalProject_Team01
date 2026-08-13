package back.backend.global.config;

import back.backend.global.redis.RedisKeyFactory;
import back.backend.global.redis.RedisValueService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Set;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
@Slf4j
public class GoogleMapsPublicApiRateLimitFilter extends OncePerRequestFilter {

    private static final Duration WINDOW = Duration.ofSeconds(65);
    private static final Set<String> LIMITED_PATHS = Set.of(
            "/api/places/photo",
            "/api/places/photo/metadata"
    );

    private RedisValueService redisValueService;
    private final long requestsPerMinute;

    @Autowired
    public GoogleMapsPublicApiRateLimitFilter(
            @Value("${app.integrations.google-maps.public-photo-requests-per-minute:60}")
            long requestsPerMinute
    ) {
        this.requestsPerMinute = requestsPerMinute;
    }

    GoogleMapsPublicApiRateLimitFilter(
            RedisValueService redisValueService,
            long requestsPerMinute
    ) {
        this(requestsPerMinute);
        this.redisValueService = redisValueService;
    }

    @Autowired(required = false)
    void setRedisValueService(RedisValueService redisValueService) {
        this.redisValueService = redisValueService;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        if (!"GET".equals(request.getMethod())
                || !LIMITED_PATHS.contains(request.getRequestURI())) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            if (redisValueService == null) {
                throw new IllegalStateException("Redis 요청 제한 저장소가 없습니다.");
            }
            long minute = Instant.now().getEpochSecond() / 60;
            String clientKey = UUID.nameUUIDFromBytes(
                    request.getRemoteAddr().getBytes(StandardCharsets.UTF_8)
            ).toString();
            String key = RedisKeyFactory.create(
                    "google-maps-public-rate",
                    clientKey,
                    minute
            );
            long count = redisValueService.increment(key, WINDOW);
            if (requestsPerMinute > 0 && count <= requestsPerMinute) {
                filterChain.doFilter(request, response);
                return;
            }
        } catch (RuntimeException exception) {
            log.warn("공개 Google 사진 API 요청 제한 확인 실패", exception);
        }

        response.setStatus(429);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.getWriter().write(
                "{\"message\":\"사진 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.\"}"
        );
    }
}
