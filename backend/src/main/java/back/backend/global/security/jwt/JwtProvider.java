package back.backend.global.security.jwt;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.JwtBuilder;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import javax.crypto.SecretKey;
import org.springframework.stereotype.Component;

@Component
public class JwtProvider {

    private static final String CLAIM_EMAIL = "email";
    private static final String CLAIM_TYPE = "type";

    private final SecretKey key;
    private final long accessTokenExpirationMs;
    private final long refreshTokenExpirationMs;

    public JwtProvider(JwtProperties jwtProperties) {
        this.key = Keys.hmacShaKeyFor(jwtProperties.getSecret().getBytes(StandardCharsets.UTF_8));
        this.accessTokenExpirationMs = jwtProperties.getAccessTokenExpirationMs();
        this.refreshTokenExpirationMs = jwtProperties.getRefreshTokenExpirationMs();
    }

    public String createAccessToken(Long memberId, String email) {
        return createToken(memberId, TokenType.ACCESS, email, accessTokenExpirationMs);
    }

    public String createRefreshToken(Long memberId) {
        return createToken(memberId, TokenType.REFRESH, null, refreshTokenExpirationMs);
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

    public boolean isValid(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    private String createToken(Long memberId, TokenType type, String email, long expirationMs) {
        Instant now = Instant.now();
        JwtBuilder builder = Jwts.builder()
                .subject(String.valueOf(memberId))
                .claim(CLAIM_TYPE, type.name())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusMillis(expirationMs)));
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
