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

    public boolean setIfAbsent(String key, String value, Duration ttl) {
        validateKey(key);
        Objects.requireNonNull(value, "value must not be null");
        Objects.requireNonNull(ttl, "ttl must not be null");
        if (ttl.isZero() || ttl.isNegative()) {
            throw new IllegalArgumentException("ttl must be positive");
        }
        return Boolean.TRUE.equals(redisTemplate.opsForValue().setIfAbsent(key, value, ttl));
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

    public long increment(String key, Duration ttl) {
        validateKey(key);
        Objects.requireNonNull(ttl, "ttl must not be null");
        if (ttl.isZero() || ttl.isNegative()) {
            throw new IllegalArgumentException("ttl must be positive");
        }
        Long count = redisTemplate.opsForValue().increment(key);
        if (count != null && count == 1L) {
            redisTemplate.expire(key, ttl);
        }
        return count == null ? 0L : count;
    }

    private void validateKey(String key) {
        if (key == null || key.isBlank()) {
            throw new IllegalArgumentException("key must not be blank");
        }
    }
}
