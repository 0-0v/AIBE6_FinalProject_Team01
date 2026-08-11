package back.backend.domain.auth.service;

import back.backend.domain.auth.config.EmailAuthProperties;
import back.backend.domain.auth.dto.EmailVerificationPurpose;
import back.backend.domain.auth.exception.AuthErrorCode;
import back.backend.domain.member.entity.AuthProvider;
import back.backend.domain.member.entity.MemberStatus;
import back.backend.domain.member.repository.MemberRepository;
import back.backend.global.exception.BusinessException;
import back.backend.global.redis.RedisKeyFactory;
import back.backend.global.redis.RedisValueService;
import java.security.SecureRandom;
import java.util.Locale;
import org.springframework.stereotype.Service;

@Service
public class EmailVerificationService {
    private static final String CODE_NAMESPACE = "email-verification-code";
    private static final String VERIFIED_NAMESPACE = "email-verification-verified";
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final SmtpEmailClient emailClient;
    private final RedisValueService redisValueService;
    private final MemberRepository memberRepository;
    private final EmailAuthProperties properties;

    public EmailVerificationService(SmtpEmailClient emailClient, RedisValueService redisValueService,
                                    MemberRepository memberRepository, EmailAuthProperties properties) {
        this.emailClient = emailClient;
        this.redisValueService = redisValueService;
        this.memberRepository = memberRepository;
        this.properties = properties;
    }

    public void sendCode(String rawEmail, EmailVerificationPurpose purpose) {
        String email = normalize(rawEmail);
        if (purpose == EmailVerificationPurpose.SIGNUP && memberRepository.existsByEmail(email)) {
            throw new BusinessException(AuthErrorCode.EMAIL_ALREADY_EXISTS);
        }
        if (purpose == EmailVerificationPurpose.PASSWORD_RESET) {
            var member = memberRepository.findByEmail(email);
            if (member.isEmpty() || member.get().getStatus() == MemberStatus.WITHDRAWN) {
                return;
            }
            if (member.get().getProvider() != AuthProvider.LOCAL) {
                throw new BusinessException(AuthErrorCode.SOCIAL_ACCOUNT_PASSWORD_RESET);
            }
        }

        String code = "%06d".formatted(SECURE_RANDOM.nextInt(1_000_000));
        redisValueService.set(codeKey(email, purpose), code, properties.getCodeExpiration());
        emailClient.sendVerificationEmail(
                email,
                code,
                properties.getCodeExpiration().toMinutes(),
                purpose
        );
    }

    public void verifyCode(String rawEmail, String code, EmailVerificationPurpose purpose) {
        String email = normalize(rawEmail);
        String storedCode = redisValueService.get(codeKey(email, purpose))
                .orElseThrow(() -> new BusinessException(AuthErrorCode.INVALID_VERIFICATION_CODE));
        if (!storedCode.equals(code)) {
            throw new BusinessException(AuthErrorCode.INVALID_VERIFICATION_CODE);
        }
        redisValueService.delete(codeKey(email, purpose));
        redisValueService.set(verifiedKey(email, purpose), "true", properties.getVerifiedExpiration());
    }

    public void requireVerified(String rawEmail, EmailVerificationPurpose purpose) {
        if (!redisValueService.exists(verifiedKey(normalize(rawEmail), purpose))) {
            throw new BusinessException(AuthErrorCode.EMAIL_NOT_VERIFIED);
        }
    }

    public void consumeVerification(String rawEmail, EmailVerificationPurpose purpose) {
        redisValueService.delete(verifiedKey(normalize(rawEmail), purpose));
    }

    static String normalize(String email) {
        return email.strip().toLowerCase(Locale.ROOT);
    }

    private String codeKey(String email, EmailVerificationPurpose purpose) {
        return RedisKeyFactory.create(CODE_NAMESPACE, purpose.name().toLowerCase(Locale.ROOT), email);
    }

    private String verifiedKey(String email, EmailVerificationPurpose purpose) {
        return RedisKeyFactory.create(VERIFIED_NAMESPACE, purpose.name().toLowerCase(Locale.ROOT), email);
    }
}
