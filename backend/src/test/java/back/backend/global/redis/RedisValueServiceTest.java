package back.backend.global.redis;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Duration;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

@ExtendWith(MockitoExtension.class)
class RedisValueServiceTest {

    @Mock
    private StringRedisTemplate redisTemplate;

    @Mock
    private ValueOperations<String, String> valueOperations;

    private RedisValueService redisValueService;

    @BeforeEach
    void setUp() {
        redisValueService = new RedisValueService(redisTemplate);
    }

    @Test
    @DisplayName("t1 양수 TTL과 값을 전달하면 Redis에 동일한 만료시간으로 저장한다")
    void t1_setValueWithPositiveTtl() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);

        redisValueService.set("key", "value", Duration.ofMinutes(10));

        verify(valueOperations).set("key", "value", Duration.ofMinutes(10));
    }

    @Test
    @DisplayName("t2 만료시간이 0 이하이면 Redis 값 저장을 거부한다")
    void t2_nonPositiveTtlThrowsException() {
        assertThatThrownBy(() -> redisValueService.set("key", "value", Duration.ZERO))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("t3 Redis에 값이 없으면 빈 Optional을 반환한다")
    void t3_missingValueReturnsEmptyOptional() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.get("missing")).thenReturn(null);

        assertThat(redisValueService.get("missing")).isEmpty();
    }

    @Test
    @DisplayName("t4 키 삭제를 요청하면 RedisTemplate 삭제 결과를 반환한다")
    void t4_deleteReturnsRedisTemplateResult() {
        when(redisTemplate.delete("key")).thenReturn(true);

        assertThat(redisValueService.delete("key")).isTrue();
        verify(redisTemplate).delete("key");
    }

    @Test
    @DisplayName("t5 첫 요청 횟수를 증가시키면 지정한 차단 시간으로 키를 만료시킨다")
    void t5_firstIncrementAppliesAttemptWindow() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.increment("attempt-key")).thenReturn(1L);

        long count = redisValueService.increment("attempt-key", Duration.ofMinutes(10));

        assertThat(count).isEqualTo(1L);
        verify(redisTemplate).expire("attempt-key", Duration.ofMinutes(10));
    }
}
