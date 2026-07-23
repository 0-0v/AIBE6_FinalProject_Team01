package back.backend.global.security.jwt;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseCookie;

class RefreshTokenCookieProviderTest {

    private RefreshTokenCookieProvider cookieProvider;

    @BeforeEach
    void setUp() {
        JwtProperties properties = new JwtProperties();
        properties.setSecret("test-only-secret-key-that-is-at-least-32-bytes");
        properties.setAccessTokenExpirationMs(3_600_000);
        properties.setRefreshTokenExpirationMs(1_209_600_000);
        cookieProvider = new RefreshTokenCookieProvider(properties);
    }

    @Test
    @DisplayName("t1 리프레시 토큰 쿠키를 생성하면 httpOnly, secure, 만료시간이 설정된다")
    void t1_createBuildsHttpOnlySecureCookieWithExpiration() {
        ResponseCookie cookie = cookieProvider.create("refresh-token-value");

        assertThat(cookie.getName()).isEqualTo("refreshToken");
        assertThat(cookie.getValue()).isEqualTo("refresh-token-value");
        assertThat(cookie.isHttpOnly()).isTrue();
        assertThat(cookie.isSecure()).isTrue();
        assertThat(cookie.getPath()).isEqualTo("/api/auth");
        assertThat(cookie.getSameSite()).isEqualTo("None");
        assertThat(cookie.getMaxAge()).isEqualTo(Duration.ofMillis(1_209_600_000));
    }

    @Test
    @DisplayName("t2 만료 쿠키를 생성하면 값이 비어있고 만료시간이 0이다")
    void t2_expireBuildsEmptyCookieWithZeroMaxAge() {
        ResponseCookie cookie = cookieProvider.expire();

        assertThat(cookie.getValue()).isEmpty();
        assertThat(cookie.getMaxAge()).isEqualTo(Duration.ZERO);
    }
}
