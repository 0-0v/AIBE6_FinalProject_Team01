package back.backend.domain.auth.service;

import back.backend.domain.auth.exception.AuthErrorCode;
import back.backend.global.exception.BusinessException;
import back.backend.global.redis.RedisKeyFactory;
import back.backend.global.redis.RedisValueService;
import java.time.Duration;
import java.util.UUID;
import org.springframework.stereotype.Service;

/**
 * 소셜 로그인 성공 직후 액세스 토큰을 URL에 직접 노출하지 않도록,
 * 짧은 만료시간을 가진 1회용 교환 코드를 발급하고 소비한다.
 */
@Service
public class OAuthLoginCodeService {

    private static final String NAMESPACE = "oauth-login-code";
    private static final Duration CODE_TTL = Duration.ofSeconds(60);

    private final RedisValueService redisValueService;

    public OAuthLoginCodeService(RedisValueService redisValueService) {
        this.redisValueService = redisValueService;
    }

    public String issue(String accessToken) {
        String code = UUID.randomUUID().toString();
        redisValueService.set(key(code), accessToken, CODE_TTL);
        return code;
    }

    public String consume(String code) {
        return redisValueService.getAndDelete(key(code))
                .orElseThrow(() -> new BusinessException(AuthErrorCode.OAUTH_LOGIN_CODE_INVALID));
    }

    private String key(String code) {
        return RedisKeyFactory.create(NAMESPACE, code);
    }
}
