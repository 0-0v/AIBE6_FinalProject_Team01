package back.backend.global.security.jwt;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.JwtBuilder;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.Duration;
import java.util.Date;
import javax.crypto.SecretKey;
import org.springframework.stereotype.Component;

@Component
public class JwtProvider {

    private static final String CLAIM_EMAIL = "email";
    private static final String CLAIM_TYPE = "type";
    private static final String CLAIM_ADMIN_VERIFIED_UNTIL = "adminVerifiedUntil";
    private static final Duration ADMIN_VERIFICATION_DURATION = Duration.ofHours(8);

    private final SecretKey key;
    private final long accessTokenExpirationMs;
    private final long refreshTokenExpirationMs;

    public JwtProvider(JwtProperties jwtProperties) {
        this.key = Keys.hmacShaKeyFor(jwtProperties.getSecret().getBytes(StandardCharsets.UTF_8));
        this.accessTokenExpirationMs = jwtProperties.getAccessTokenExpirationMs();
        this.refreshTokenExpirationMs = jwtProperties.getRefreshTokenExpirationMs();
    }

    public String createAccessToken(Long memberId, String email) {
        return createAccessToken(memberId, email, false);
    }

    public String createAccessToken(Long memberId, String email, boolean adminVerified) {
        return createAccessToken(memberId, email,
                adminVerified ? Instant.now().plus(ADMIN_VERIFICATION_DURATION) : null);
    }

    public String createAccessToken(Long memberId, String email, Instant adminVerifiedUntil) {
        return createToken(memberId, TokenType.ACCESS, email, accessTokenExpirationMs,
                adminVerifiedUntil);
    }

    public String createRefreshToken(Long memberId) {
        return createRefreshToken(memberId, false);
    }

    public String createRefreshToken(Long memberId, boolean adminVerified) {
        return createRefreshToken(memberId,
                adminVerified ? Instant.now().plus(ADMIN_VERIFICATION_DURATION) : null);
    }

    public String createRefreshToken(Long memberId, Instant adminVerifiedUntil) {
        return createToken(memberId, TokenType.REFRESH, null, refreshTokenExpirationMs,
                adminVerifiedUntil);
    }

    public Long getMemberId(String token) {
        return Long.valueOf(parseClaims(token).getSubject());
    }

    public String getEmail(String token) {
        return parseClaims(token).get(CLAIM_EMAIL, String.class);
    }

    public TokenType getTokenType(String token) {
        return TokenType.valueOf(parseClaims(token).get(CLAIM_TYPE, String.class));
    }

    public boolean isAdminVerified(String token) {
        Instant verifiedUntil = getAdminVerifiedUntil(token);
        return verifiedUntil != null && Instant.now().isBefore(verifiedUntil);
    }

    public Instant getAdminVerifiedUntil(String token) {
        Number epochMillis = parseClaims(token).get(CLAIM_ADMIN_VERIFIED_UNTIL, Number.class);
        return epochMillis == null ? null : Instant.ofEpochMilli(epochMillis.longValue());
    }

    public boolean isValid(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    private String createToken(Long memberId, TokenType type, String email, long expirationMs,
                               Instant adminVerifiedUntil) {
        Instant now = Instant.now();
        JwtBuilder builder = Jwts.builder()
                .subject(String.valueOf(memberId))
                .claim(CLAIM_TYPE, type.name())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusMillis(expirationMs)));
        if (adminVerifiedUntil != null) {
            builder.claim(CLAIM_ADMIN_VERIFIED_UNTIL, adminVerifiedUntil.toEpochMilli());
        }
        if (email != null) {
            builder.claim(CLAIM_EMAIL, email);
        }
        return builder.signWith(key).compact();
    }

    private Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
