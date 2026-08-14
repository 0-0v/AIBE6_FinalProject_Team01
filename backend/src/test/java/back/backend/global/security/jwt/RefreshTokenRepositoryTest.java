package back.backend.global.security.jwt;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import back.backend.global.redis.RedisValueService;
import java.time.Duration;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.RedisScript;

@ExtendWith(MockitoExtension.class)
class RefreshTokenRepositoryTest {

    @Mock
    private RedisValueService redisValueService;

    @Mock
    private StringRedisTemplate redisTemplate;

    private RefreshTokenRepository refreshTokenRepository;

    @BeforeEach
    void setUp() {
        JwtProperties jwtProperties = new JwtProperties();
        jwtProperties.setSecret("test-only-secret-key-that-is-at-least-32-bytes");
        jwtProperties.setAccessTokenExpirationMs(3_600_000);
        jwtProperties.setRefreshTokenExpirationMs(1_209_600_000);
        refreshTokenRepository = new RefreshTokenRepository(redisValueService, redisTemplate, jwtProperties);
    }

    @Test
    @DisplayName("t1 회원 식별자로 리프레시 토큰을 저장하면 만료시간과 함께 Redis에 저장되고 유예 토큰은 제거된다")
    void t1_saveStoresRefreshTokenWithExpiration() {
        refreshTokenRepository.save(1L, "refresh-token-value");

        verify(redisValueService).set(eq("refresh-token:1"), eq("refresh-token-value"), eq(Duration.ofMillis(1_209_600_000)));
        verify(redisValueService).delete("refresh-token-grace:1");
    }

    @Test
    @DisplayName("t2 저장된 리프레시 토큰을 회원 식별자로 조회할 수 있다")
    void t2_findByMemberIdReturnsStoredToken() {
        when(redisValueService.get("refresh-token:2")).thenReturn(Optional.of("stored-token"));

        Optional<String> found = refreshTokenRepository.findByMemberId(2L);

        assertThat(found).contains("stored-token");
    }

    @Test
    @DisplayName("t3 회원 식별자로 리프레시 토큰을 삭제하면 현재 토큰과 유예 토큰이 모두 Redis에서 제거된다")
    void t3_deleteByMemberIdRemovesToken() {
        refreshTokenRepository.deleteByMemberId(3L);

        verify(redisValueService).delete("refresh-token:3");
        verify(redisValueService).delete("refresh-token-grace:3");
    }

    @Test
    @DisplayName("t4 제시된 토큰이 현재 토큰과 일치하면 회전에 성공한 것으로 판단하고 새 토큰을 반환한다")
    @SuppressWarnings("unchecked")
    void t4_rotateReturnsRotatedWhenPresentedTokenMatchesCurrent() {
        when(redisTemplate.execute(
                        any(RedisScript.class),
                        eq(List.of("refresh-token:1", "refresh-token-grace:1")),
                        eq("old-token"), eq("new-token"), any(), any()))
                .thenReturn("ROTATED");

        RefreshRotationResult result = refreshTokenRepository.rotate(1L, "old-token", "new-token");

        assertThat(result.status()).isEqualTo(RefreshRotationResult.Status.ROTATED);
        assertThat(result.refreshToken()).isEqualTo("new-token");
    }

    @Test
    @DisplayName("t5 제시된 토큰이 방금 폐기된 유예 토큰과 일치하면 이미 회전된 최신 토큰을 그대로 반환한다")
    @SuppressWarnings("unchecked")
    void t5_rotateReturnsAlreadyRotatedWhenPresentedTokenIsGracePeriodToken() {
        when(redisTemplate.execute(
                        any(RedisScript.class),
                        eq(List.of("refresh-token:1", "refresh-token-grace:1")),
                        eq("stale-token"), eq("new-token"), any(), any()))
                .thenReturn("already-rotated-current-token");

        RefreshRotationResult result = refreshTokenRepository.rotate(1L, "stale-token", "new-token");

        assertThat(result.status()).isEqualTo(RefreshRotationResult.Status.ALREADY_ROTATED);
        assertThat(result.refreshToken()).isEqualTo("already-rotated-current-token");
    }

    @Test
    @DisplayName("t6 제시된 토큰이 현재 토큰이나 유예 토큰과 일치하지 않으면 재사용으로 간주해 무효 처리한다")
    @SuppressWarnings("unchecked")
    void t6_rotateReturnsInvalidWhenPresentedTokenDoesNotMatchAnyStoredToken() {
        when(redisTemplate.execute(
                        any(RedisScript.class),
                        eq(List.of("refresh-token:1", "refresh-token-grace:1")),
                        eq("unknown-token"), eq("new-token"), any(), any()))
                .thenReturn("REUSE_DETECTED");

        RefreshRotationResult result = refreshTokenRepository.rotate(1L, "unknown-token", "new-token");

        assertThat(result.isValid()).isFalse();
        assertThat(result.refreshToken()).isNull();
    }
}
