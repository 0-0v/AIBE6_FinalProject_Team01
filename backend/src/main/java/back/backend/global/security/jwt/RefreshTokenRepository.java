package back.backend.global.security.jwt;

import back.backend.global.redis.RedisKeyFactory;
import back.backend.global.redis.RedisValueService;
import java.time.Duration;
import java.util.Optional;
import org.springframework.stereotype.Component;

@Component
public class RefreshTokenRepository {

    private static final String NAMESPACE = "refresh-token";

    private final RedisValueService redisValueService;
    private final JwtProperties jwtProperties;

    public RefreshTokenRepository(RedisValueService redisValueService, JwtProperties jwtProperties) {
        this.redisValueService = redisValueService;
        this.jwtProperties = jwtProperties;
    }

    public void save(Long memberId, String refreshToken) {
        redisValueService.set(key(memberId), refreshToken, Duration.ofMillis(jwtProperties.getRefreshTokenExpirationMs()));
    }

    public Optional<String> findByMemberId(Long memberId) {
        return redisValueService.get(key(memberId));
    }

    public void deleteByMemberId(Long memberId) {
        redisValueService.delete(key(memberId));
    }

    private String key(Long memberId) {
        return RedisKeyFactory.create(NAMESPACE, memberId.toString());
    }
}
