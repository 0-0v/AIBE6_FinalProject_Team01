package back.backend.domain.auth.service;

import back.backend.domain.auth.config.EmailAuthProperties;
import back.backend.domain.auth.dto.AdminOtpChallengeResponse;
import back.backend.domain.auth.dto.AdminOtpVerifyRequest;
import back.backend.domain.auth.dto.LoginRequest;
import back.backend.domain.auth.dto.TokenResponse;
import back.backend.domain.auth.exception.AuthErrorCode;
import back.backend.domain.member.entity.Member;
import back.backend.global.exception.BusinessException;
import back.backend.global.redis.RedisKeyFactory;
import back.backend.global.redis.RedisValueService;
import java.security.SecureRandom;
import java.security.MessageDigest;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.UUID;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AdminOtpService {
    private static final int MAX_ATTEMPTS = 5;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final String CHALLENGE_NAMESPACE = "admin-login-otp";
    private static final String RATE_NAMESPACE = "admin-login-otp-rate";
    private static final String ATTEMPT_NAMESPACE = "admin-login-attempt";

    private final AuthService authService;
    private final BrevoEmailClient emailClient;
    private final RedisValueService redisValueService;
    private final PasswordEncoder passwordEncoder;
    private final EmailAuthProperties properties;

    public AdminOtpService(AuthService authService, BrevoEmailClient emailClient,
                           RedisValueService redisValueService, PasswordEncoder passwordEncoder,
                           EmailAuthProperties properties) {
        this.authService = authService;
        this.emailClient = emailClient;
        this.redisValueService = redisValueService;
        this.passwordEncoder = passwordEncoder;
        this.properties = properties;
    }

    public AdminOtpChallengeResponse request(LoginRequest request) {
        return request(request, "unknown");
    }

    public AdminOtpChallengeResponse request(LoginRequest request, String clientAddress) {
        String attemptKey = attemptKey(request.identifier(), clientAddress);
        long attempts = redisValueService.increment(
                attemptKey, properties.getAdminLoginAttemptWindow());
        if (attempts > properties.getAdminLoginMaxAttempts()) {
            throw new BusinessException(AuthErrorCode.ADMIN_OTP_RATE_LIMITED);
        }
        Member admin = authService.requireAdminCredentials(request);
        redisValueService.delete(attemptKey);
        return issueChallenge(admin);
    }

    public AdminOtpChallengeResponse requestForSubAdmin(Long memberId) {
        return issueChallenge(authService.requireSubAdmin(memberId));
    }

    private AdminOtpChallengeResponse issueChallenge(Member admin) {
        String rateKey = RedisKeyFactory.create(RATE_NAMESPACE, admin.getId().toString());
        if (redisValueService.exists(rateKey)) {
            throw new BusinessException(AuthErrorCode.ADMIN_OTP_RATE_LIMITED);
        }
        String code = "%06d".formatted(SECURE_RANDOM.nextInt(1_000_000));
        String challengeToken = UUID.randomUUID().toString();
        redisValueService.set(challengeKey(challengeToken), encode(admin.getId(), code, 0),
                properties.getAdminOtpExpiration());
        redisValueService.set(rateKey, "1", properties.getAdminOtpResendInterval());
        try {
            emailClient.sendAdminOtpEmail(admin.getEmail(), code,
                    properties.getAdminOtpExpiration().toMinutes());
        } catch (RuntimeException exception) {
            redisValueService.delete(challengeKey(challengeToken));
            redisValueService.delete(rateKey);
            throw exception;
        }
        return new AdminOtpChallengeResponse(challengeToken, maskEmail(admin.getEmail()),
                properties.getAdminOtpExpiration().toSeconds());
    }

    public TokenResponse verify(AdminOtpVerifyRequest request) {
        String key = challengeKey(request.challengeToken());
        Challenge challenge = redisValueService.get(key).map(this::decode)
                .orElseThrow(() -> new BusinessException(AuthErrorCode.ADMIN_OTP_INVALID));
        if (!passwordEncoder.matches(request.code(), challenge.codeHash())) {
            int attempts = challenge.attempts() + 1;
            if (attempts >= MAX_ATTEMPTS) redisValueService.delete(key);
            else redisValueService.remainingTtl(key).ifPresentOrElse(
                    remaining -> redisValueService.set(key,
                            encodeHashed(challenge.memberId(), challenge.codeHash(), attempts), remaining),
                    () -> redisValueService.delete(key));
            throw new BusinessException(AuthErrorCode.ADMIN_OTP_INVALID);
        }
        redisValueService.delete(key);
        return authService.completeAdminLogin(challenge.memberId());
    }

    private String encode(Long memberId, String code, int attempts) {
        return encodeHashed(memberId, passwordEncoder.encode(code), attempts);
    }

    private String encodeHashed(Long memberId, String codeHash, int attempts) {
        return memberId + "|" + codeHash + "|" + attempts;
    }

    private Challenge decode(String value) {
        String[] fields = value.split("\\|", 3);
        if (fields.length != 3) throw new BusinessException(AuthErrorCode.ADMIN_OTP_INVALID);
        try {
            return new Challenge(Long.valueOf(fields[0]), fields[1], Integer.parseInt(fields[2]));
        } catch (NumberFormatException exception) {
            throw new BusinessException(AuthErrorCode.ADMIN_OTP_INVALID);
        }
    }

    private String challengeKey(String token) {
        return RedisKeyFactory.create(CHALLENGE_NAMESPACE, token);
    }

    private String attemptKey(String identifier, String clientAddress) {
        String source = identifier.strip().toLowerCase() + "|" + clientAddress;
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(source.getBytes(StandardCharsets.UTF_8));
            return RedisKeyFactory.create(ATTEMPT_NAMESPACE,
                    Base64.getUrlEncoder().withoutPadding().encodeToString(digest));
        } catch (java.security.NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256을 사용할 수 없습니다.", exception);
        }
    }

    private String maskEmail(String email) {
        int at = email.indexOf('@');
        if (at <= 1) return "***" + email.substring(Math.max(at, 0));
        return email.substring(0, 2) + "***" + email.substring(at);
    }

    private record Challenge(Long memberId, String codeHash, int attempts) {}
}
