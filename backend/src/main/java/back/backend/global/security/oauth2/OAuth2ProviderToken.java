package back.backend.global.security.oauth2;

import java.time.Instant;

public record OAuth2ProviderToken(
        String accessToken,
        String refreshToken,
        Instant accessTokenExpiresAt
) {
}
