package back.backend.domain.auth.service;

import back.backend.domain.auth.config.LoginAttemptProperties;
import back.backend.domain.auth.dto.LoginRequest;
import back.backend.domain.auth.dto.TokenResponse;
import back.backend.domain.auth.exception.AuthErrorCode;
import back.backend.domain.auth.exception.LoginRateLimitException;
import back.backend.global.exception.BusinessException;
import back.backend.global.redis.RedisKeyFactory;
import back.backend.global.redis.RedisValueService;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.util.Base64;
import java.util.Locale;
import org.springframework.stereotype.Service;

@Service
public class LoginAttemptService {
    private static final String IDENTIFIER_NAMESPACE = "login-attempt-identifier";
    private static final String IP_NAMESPACE = "login-attempt-ip";

    private final AuthService authService;
    private final RedisValueService redisValueService;
    private final LoginAttemptProperties properties;

    public LoginAttemptService(AuthService authService, RedisValueService redisValueService,
                               LoginAttemptProperties properties) {
        this.authService = authService;
        this.redisValueService = redisValueService;
        this.properties = properties;
    }

    public TokenResponse login(LoginRequest request, String clientIp) {
        String identifierKey = identifierKey(request.identifier(), clientIp);
        String ipKey = ipKey(clientIp);
        requireNotLimited(identifierKey, properties.getIdentifierMaxFailures());
        requireNotLimited(ipKey, properties.getIpMaxFailures());

        try {
            TokenResponse tokens = authService.login(request);
            redisValueService.delete(identifierKey);
            return tokens;
        } catch (BusinessException exception) {
            if (exception.getErrorCode() != AuthErrorCode.INVALID_CREDENTIALS) {
                throw exception;
            }
            long identifierFailures = redisValueService.increment(identifierKey, properties.getWindow());
            long ipFailures = redisValueService.increment(ipKey, properties.getWindow());
            if (identifierFailures >= properties.getIdentifierMaxFailures()
                    || ipFailures >= properties.getIpMaxFailures()) {
                throw rateLimitException(identifierFailures >= properties.getIdentifierMaxFailures()
                        ? identifierKey : ipKey);
            }
            throw exception;
        }
    }

    private void requireNotLimited(String key, int maxFailures) {
        long failures = redisValueService.get(key).map(this::parseCount).orElse(0L);
        if (failures >= maxFailures) {
            throw rateLimitException(key);
        }
    }

    private long parseCount(String value) {
        try {
            return Long.parseLong(value);
        } catch (NumberFormatException exception) {
            return 0L;
        }
    }

    private LoginRateLimitException rateLimitException(String key) {
        long retryAfterSeconds = redisValueService.remainingTtl(key)
                .map(Duration::toSeconds)
                .orElse(properties.getWindow().toSeconds());
        return new LoginRateLimitException(retryAfterSeconds);
    }

    private String identifierKey(String identifier, String clientIp) {
        String normalizedIdentifier = identifier.strip().toLowerCase(Locale.ROOT);
        return RedisKeyFactory.create(IDENTIFIER_NAMESPACE,
                hash(normalizedIdentifier + "|" + clientIp));
    }

    private String ipKey(String clientIp) {
        return RedisKeyFactory.create(IP_NAMESPACE, hash(clientIp));
    }

    private String hash(String source) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(source.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(digest);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256을 사용할 수 없습니다.", exception);
        }
    }
}
