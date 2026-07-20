package back.backend.global.redis;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class RedisKeyFactoryTest {

    @Test
    @DisplayName("t1 네임스페이스와 식별자로 콜론 구분 Redis 키를 생성한다")
    void t1_createColonDelimitedRedisKey() {
        assertThat(RedisKeyFactory.create("refresh-token", 1L, "device-a"))
                .isEqualTo("refresh-token:1:device-a");
    }

    @Test
    @DisplayName("t2 빈 네임스페이스를 전달하면 Redis 키 생성을 거부한다")
    void t2_blankNamespaceThrowsException() {
        assertThatThrownBy(() -> RedisKeyFactory.create(" ", 1L))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("t3 키 구성 요소에 콜론이 포함되면 Redis 키 생성을 거부한다")
    void t3_delimiterInKeyPartThrowsException() {
        assertThatThrownBy(() -> RedisKeyFactory.create("member", "1:2"))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
