package back.backend.global.security.jwt;

import java.time.Duration;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

@Component
public class RefreshTokenCookieProvider {

    private static final String COOKIE_NAME = "refreshToken";
    private static final String COOKIE_PATH = "/api/auth";

    private final long refreshTokenExpirationMs;

    public RefreshTokenCookieProvider(JwtProperties jwtProperties) {
        this.refreshTokenExpirationMs = jwtProperties.getRefreshTokenExpirationMs();
    }

    public ResponseCookie create(String refreshToken) {
        return build(refreshToken, Duration.ofMillis(refreshTokenExpirationMs));
    }

    public ResponseCookie expire() {
        return build("", Duration.ZERO);
    }

    private ResponseCookie build(String value, Duration maxAge) {
        return ResponseCookie.from(COOKIE_NAME, value)
                .httpOnly(true)
                .secure(true)
                .sameSite("None")
                .path(COOKIE_PATH)
                .maxAge(maxAge)
                .build();
    }
}
