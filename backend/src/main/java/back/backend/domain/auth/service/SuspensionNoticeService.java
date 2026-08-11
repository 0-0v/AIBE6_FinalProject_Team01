package back.backend.domain.auth.service;

import back.backend.domain.auth.dto.SuspensionNoticeResponse;
import back.backend.domain.auth.exception.AuthErrorCode;
import back.backend.domain.member.entity.Member;
import back.backend.global.exception.BusinessException;
import back.backend.global.redis.RedisKeyFactory;
import back.backend.global.redis.RedisValueService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Duration;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class SuspensionNoticeService {

    private static final String NAMESPACE = "suspension-notice";
    private static final Duration NOTICE_TTL = Duration.ofMinutes(5);

    private final RedisValueService redisValueService;
    private final ObjectMapper objectMapper;

    public SuspensionNoticeService(RedisValueService redisValueService) {
        this.redisValueService = redisValueService;
        this.objectMapper = new ObjectMapper().findAndRegisterModules();
    }

    public String issue(Member member) {
        String token = UUID.randomUUID().toString();
        SuspensionNoticeResponse notice = new SuspensionNoticeResponse(
                member.getSuspensionReason(), member.getSuspendedAt(), member.getSuspendedUntil());
        try {
            redisValueService.set(key(token), objectMapper.writeValueAsString(notice), NOTICE_TTL);
            return token;
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Suspension notice serialization failed", exception);
        }
    }

    public SuspensionNoticeResponse consume(String token) {
        String value = redisValueService.getAndDelete(key(token))
                .orElseThrow(() -> new BusinessException(AuthErrorCode.SUSPENSION_NOTICE_INVALID));
        try {
            return objectMapper.readValue(value, SuspensionNoticeResponse.class);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Suspension notice deserialization failed", exception);
        }
    }

    private String key(String token) {
        return RedisKeyFactory.create(NAMESPACE, token);
    }
}
