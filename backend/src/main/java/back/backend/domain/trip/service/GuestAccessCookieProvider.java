package back.backend.domain.trip.service;

import java.time.Duration;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

@Component
public class GuestAccessCookieProvider {

    public static final String COOKIE_NAME = "guestAccessToken";
    private static final Duration EXPIRATION = Duration.ofDays(7);

    public ResponseCookie create(String token) {
        return build(token, EXPIRATION);
    }

    public ResponseCookie expire() {
        return build("", Duration.ZERO);
    }

    private ResponseCookie build(String value, Duration maxAge) {
        return ResponseCookie.from(COOKIE_NAME, value)
                .httpOnly(true)
                .secure(true)
                .sameSite("None")
                .path("/")
                .maxAge(maxAge)
                .build();
    }
}
