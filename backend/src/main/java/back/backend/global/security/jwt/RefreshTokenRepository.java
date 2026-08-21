package back.backend.global.security.jwt;

import back.backend.global.redis.RedisKeyFactory;
import back.backend.global.redis.RedisValueService;
import java.time.Duration;
import java.util.List;
import java.util.Optional;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.RedisScript;
import org.springframework.stereotype.Component;

@Component
public class RefreshTokenRepository {

    private static final String NAMESPACE = "refresh-token";
    private static final String GRACE_NAMESPACE = "refresh-token-grace";

    // 여러 탭/기기가 같은 리프레시 토큰으로 거의 동시에 재발급을 요청하면,
    // 먼저 회전에 성공한 요청 때문에 나중 요청이 "이미 폐기된 토큰"을 들고 오게 된다.
    // 이 유예 기간 동안은 방금 회전되어 폐기된 토큰을 탈취가 아닌 정상 동시 요청으로 보고
    // 이미 발급된 최신 토큰을 그대로 돌려준다. 유예 기간이 지난 재사용만 탈취로 간주한다.
    private static final Duration GRACE_PERIOD = Duration.ofSeconds(5);

    // KEYS[1] = 현재 토큰 키, KEYS[2] = 유예 토큰(직전에 회전되어 폐기된 토큰) 키
    // ARGV[1] = 제시된 토큰, ARGV[2] = 새로 발급할 토큰, ARGV[3] = 새 토큰 TTL(ms), ARGV[4] = 유예 TTL(ms)
    private static final RedisScript<String> ROTATE_SCRIPT = RedisScript.of("""
            local current = redis.call('GET', KEYS[1])
            if current == ARGV[1] then
                redis.call('SET', KEYS[2], current, 'PX', ARGV[4])
                redis.call('SET', KEYS[1], ARGV[2], 'PX', ARGV[3])
                return 'ROTATED'
            end
            if current ~= false then
                local previous = redis.call('GET', KEYS[2])
                if previous == ARGV[1] then
                    return current
                end
            end
            redis.call('DEL', KEYS[1])
            redis.call('DEL', KEYS[2])
            return 'REUSE_DETECTED'
            """, String.class);

    private final RedisValueService redisValueService;
    private final StringRedisTemplate redisTemplate;
    private final JwtProperties jwtProperties;

    public RefreshTokenRepository(
            RedisValueService redisValueService,
            StringRedisTemplate redisTemplate,
            JwtProperties jwtProperties
    ) {
        this.redisValueService = redisValueService;
        this.redisTemplate = redisTemplate;
        this.jwtProperties = jwtProperties;
    }

    public void save(Long memberId, String refreshToken) {
        redisValueService.set(key(memberId), refreshToken, Duration.ofMillis(jwtProperties.getRefreshTokenExpirationMs()));
        redisValueService.delete(graceKey(memberId));
    }

    public Optional<String> findByMemberId(Long memberId) {
        return redisValueService.get(key(memberId));
    }

    public void deleteByMemberId(Long memberId) {
        redisValueService.delete(key(memberId));
        redisValueService.delete(graceKey(memberId));
    }

    /**
     * 리프레시 토큰을 원자적으로 회전한다.
     * 제시된 토큰이 현재 토큰과 일치하면 새 토큰으로 교체하고, 직전에 폐기된 토큰이면
     * 유예 기간 내에서는 이미 회전된 최신 토큰을 그대로 반환한다(동시 탭 대응).
     * 그 외의 경우(진짜 재사용/탈취로 의심)에는 세션을 완전히 폐기한다.
     */
    public RefreshRotationResult rotate(Long memberId, String presentedToken, String newToken) {
        String result = redisTemplate.execute(
                ROTATE_SCRIPT,
                List.of(key(memberId), graceKey(memberId)),
                presentedToken,
                newToken,
                String.valueOf(jwtProperties.getRefreshTokenExpirationMs()),
                String.valueOf(GRACE_PERIOD.toMillis()));

        if ("ROTATED".equals(result)) {
            return RefreshRotationResult.rotated(newToken);
        }
        if ("REUSE_DETECTED".equals(result)) {
            return RefreshRotationResult.invalid();
        }
        if (result == null || result.isBlank()) {
            return RefreshRotationResult.invalid();
        }
        return RefreshRotationResult.alreadyRotated(result);
    }

    private String key(Long memberId) {
        return RedisKeyFactory.create(NAMESPACE, memberId.toString());
    }

    private String graceKey(Long memberId) {
        return RedisKeyFactory.create(GRACE_NAMESPACE, memberId.toString());
    }
}
