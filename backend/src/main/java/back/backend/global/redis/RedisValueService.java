package back.backend.global.redis;

import java.time.Duration;
import java.util.Objects;
import java.util.Optional;
import java.util.concurrent.TimeUnit;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

@Component
public class RedisValueService {

    private final StringRedisTemplate redisTemplate;

    public RedisValueService(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public void set(String key, String value, Duration ttl) {
        validateKey(key);
        Objects.requireNonNull(value, "value must not be null");
        Objects.requireNonNull(ttl, "ttl must not be null");
        if (ttl.isZero() || ttl.isNegative()) {
            throw new IllegalArgumentException("ttl must be positive");
        }
        redisTemplate.opsForValue().set(key, value, ttl);
    }

    public Optional<String> get(String key) {
        validateKey(key);
        return Optional.ofNullable(redisTemplate.opsForValue().get(key));
    }

    public Optional<String> getAndDelete(String key) {
        validateKey(key);
        return Optional.ofNullable(redisTemplate.opsForValue().getAndDelete(key));
    }

    public boolean delete(String key) {
        validateKey(key);
        return Boolean.TRUE.equals(redisTemplate.delete(key));
    }

    public boolean exists(String key) {
        validateKey(key);
        return Boolean.TRUE.equals(redisTemplate.hasKey(key));
    }

    public Optional<Duration> remainingTtl(String key) {
        validateKey(key);
        Long milliseconds = redisTemplate.getExpire(key, TimeUnit.MILLISECONDS);
        if (milliseconds == null || milliseconds <= 0) {
            return Optional.empty();
        }
        return Optional.of(Duration.ofMillis(milliseconds));
    }

    private void validateKey(String key) {
        if (key == null || key.isBlank()) {
            throw new IllegalArgumentException("key must not be blank");
        }
    }
}
