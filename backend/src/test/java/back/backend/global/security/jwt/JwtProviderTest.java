package back.backend.global.security.jwt;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import io.jsonwebtoken.ExpiredJwtException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class JwtProviderTest {

    private static final String SECRET = "test-only-secret-key-that-is-at-least-32-bytes";

    private JwtProvider newProvider(long accessTokenExpirationMs, long refreshTokenExpirationMs) {
        JwtProperties properties = new JwtProperties();
        properties.setSecret(SECRET);
        properties.setAccessTokenExpirationMs(accessTokenExpirationMs);
        properties.setRefreshTokenExpirationMs(refreshTokenExpirationMs);
        return new JwtProvider(properties);
    }

    @Test
    @DisplayName("t1 액세스 토큰을 생성하면 회원 식별자, 이메일, ACCESS 타입을 담는다")
    void t1_createAccessTokenContainsMemberIdEmailAndType() {
        JwtProvider provider = newProvider(60_000, 1_209_600_000);

        String token = provider.createAccessToken(1L, "user@example.com");

        assertThat(provider.getMemberId(token)).isEqualTo(1L);
        assertThat(provider.getEmail(token)).isEqualTo("user@example.com");
        assertThat(provider.getTokenType(token)).isEqualTo(TokenType.ACCESS);
    }

    @Test
    @DisplayName("t2 리프레시 토큰을 생성하면 회원 식별자와 REFRESH 타입을 담는다")
    void t2_createRefreshTokenContainsMemberIdAndType() {
        JwtProvider provider = newProvider(60_000, 1_209_600_000);

        String token = provider.createRefreshToken(2L);

        assertThat(provider.getMemberId(token)).isEqualTo(2L);
        assertThat(provider.getTokenType(token)).isEqualTo(TokenType.REFRESH);
    }

    @Test
    @DisplayName("t3 유효한 토큰은 isValid가 true를 반환한다")
    void t3_validTokenIsValid() {
        JwtProvider provider = newProvider(60_000, 1_209_600_000);

        String token = provider.createAccessToken(3L, "user3@example.com");

        assertThat(provider.isValid(token)).isTrue();
    }

    @Test
    @DisplayName("t4 만료된 토큰은 isValid가 false를 반환한다")
    void t4_expiredTokenIsInvalid() throws InterruptedException {
        JwtProvider provider = newProvider(1, 1);

        String token = provider.createAccessToken(4L, "user4@example.com");
        Thread.sleep(10);

        assertThat(provider.isValid(token)).isFalse();
    }

    @Test
    @DisplayName("t5 만료된 토큰에서 회원 식별자를 조회하면 예외가 발생한다")
    void t5_getMemberIdThrowsWhenTokenExpired() throws InterruptedException {
        JwtProvider provider = newProvider(1, 1);

        String token = provider.createAccessToken(5L, "user5@example.com");
        Thread.sleep(10);

        assertThatThrownBy(() -> provider.getMemberId(token))
                .isInstanceOf(ExpiredJwtException.class);
    }

    @Test
    @DisplayName("t6 형식이 잘못된 토큰은 isValid가 false를 반환한다")
    void t6_malformedTokenIsInvalid() {
        JwtProvider provider = newProvider(60_000, 1_209_600_000);

        assertThat(provider.isValid("not-a-jwt")).isFalse();
    }

    @Test
    @DisplayName("t7 서로 다른 비밀키로 서명된 토큰은 isValid가 false를 반환한다")
    void t7_tokenSignedWithDifferentSecretIsInvalid() {
        JwtProvider issuer = newProvider(60_000, 1_209_600_000);
        JwtProperties otherProperties = new JwtProperties();
        otherProperties.setSecret("different-secret-key-that-is-at-least-32-bytes!");
        otherProperties.setAccessTokenExpirationMs(60_000);
        otherProperties.setRefreshTokenExpirationMs(1_209_600_000);
        JwtProvider verifier = new JwtProvider(otherProperties);

        String token = issuer.createAccessToken(7L, "user7@example.com");

        assertThat(verifier.isValid(token)).isFalse();
    }

    @Test
    @DisplayName("t8 관리자 OTP 검증 토큰은 관리자 검증 완료 상태를 포함한다")
    void t8_adminVerifiedTokenContainsVerificationClaim() {
        JwtProvider provider = newProvider(60_000, 1_209_600_000);

        String token = provider.createAccessToken(8L, "admin@example.com", true);

        assertThat(provider.isAdminVerified(token)).isTrue();
    }
}
