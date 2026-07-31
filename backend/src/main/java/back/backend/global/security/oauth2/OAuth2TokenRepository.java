package back.backend.global.security.oauth2;

import back.backend.domain.member.entity.AuthProvider;
import back.backend.global.redis.RedisKeyFactory;
import back.backend.global.redis.RedisValueService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Optional;
import org.springframework.stereotype.Component;

@Component
public class OAuth2TokenRepository {

    private static final String NAMESPACE = "oauth-token";

    private final RedisValueService redisValueService;
    private final OAuth2TokenCipher cipher;
    private final OAuth2TokenProperties properties;
    private final ObjectMapper objectMapper;

    public OAuth2TokenRepository(
            RedisValueService redisValueService,
            OAuth2TokenCipher cipher,
            OAuth2TokenProperties properties
    ) {
        this.redisValueService = redisValueService;
        this.cipher = cipher;
        this.properties = properties;
        this.objectMapper = new ObjectMapper().findAndRegisterModules();
    }

    public void save(Long memberId, AuthProvider provider, OAuth2ProviderToken token) {
        OAuth2ProviderToken merged = find(memberId, provider)
                .filter(existing -> token.refreshToken() == null || token.refreshToken().isBlank())
                .map(existing -> new OAuth2ProviderToken(
                        token.accessToken(),
                        existing.refreshToken(),
                        token.accessTokenExpiresAt()))
                .orElse(token);
        try {
            String json = objectMapper.writeValueAsString(merged);
            redisValueService.set(key(memberId, provider), cipher.encrypt(json), properties.getRetention());
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("OAuth token serialization failed", exception);
        }
    }

    public Optional<OAuth2ProviderToken> find(Long memberId, AuthProvider provider) {
        return redisValueService.get(key(memberId, provider)).map(value -> {
            try {
                return objectMapper.readValue(cipher.decrypt(value), OAuth2ProviderToken.class);
            } catch (JsonProcessingException exception) {
                throw new IllegalStateException("OAuth token deserialization failed", exception);
            }
        });
    }

    public void delete(Long memberId, AuthProvider provider) {
        redisValueService.delete(key(memberId, provider));
    }

    private String key(Long memberId, AuthProvider provider) {
        return RedisKeyFactory.create(
                NAMESPACE,
                provider.name().toLowerCase(),
                memberId.toString());
    }
}
