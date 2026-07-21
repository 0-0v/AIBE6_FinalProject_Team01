package back.backend.global.security.jwt;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import back.backend.global.redis.RedisValueService;
import java.time.Duration;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class RefreshTokenRepositoryTest {

    @Mock
    private RedisValueService redisValueService;

    private RefreshTokenRepository refreshTokenRepository;

    @BeforeEach
    void setUp() {
        JwtProperties jwtProperties = new JwtProperties();
        jwtProperties.setSecret("test-only-secret-key-that-is-at-least-32-bytes");
        jwtProperties.setAccessTokenExpirationMs(3_600_000);
        jwtProperties.setRefreshTokenExpirationMs(1_209_600_000);
        refreshTokenRepository = new RefreshTokenRepository(redisValueService, jwtProperties);
    }

    @Test
    @DisplayName("t1 회원 식별자로 리프레시 토큰을 저장하면 만료시간과 함께 Redis에 저장된다")
    void t1_saveStoresRefreshTokenWithExpiration() {
        refreshTokenRepository.save(1L, "refresh-token-value");

        verify(redisValueService).set(eq("refresh-token:1"), eq("refresh-token-value"), eq(Duration.ofMillis(1_209_600_000)));
    }

    @Test
    @DisplayName("t2 저장된 리프레시 토큰을 회원 식별자로 조회할 수 있다")
    void t2_findByMemberIdReturnsStoredToken() {
        when(redisValueService.get("refresh-token:2")).thenReturn(Optional.of("stored-token"));

        Optional<String> found = refreshTokenRepository.findByMemberId(2L);

        assertThat(found).contains("stored-token");
    }

    @Test
    @DisplayName("t3 회원 식별자로 리프레시 토큰을 삭제하면 Redis에서 제거된다")
    void t3_deleteByMemberIdRemovesToken() {
        refreshTokenRepository.deleteByMemberId(3L);

        verify(redisValueService).delete("refresh-token:3");
    }
}
