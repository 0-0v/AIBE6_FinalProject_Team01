package back.backend.domain.auth.service;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import back.backend.domain.auth.config.EmailAuthProperties;
import back.backend.domain.auth.dto.EmailVerificationPurpose;
import back.backend.domain.member.entity.AuthProvider;
import back.backend.domain.member.repository.MemberRepository;
import back.backend.global.exception.BusinessException;
import back.backend.global.redis.RedisValueService;
import java.time.Duration;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

@ExtendWith(MockitoExtension.class)
class EmailVerificationServiceTest {

    @Mock
    private JavaMailSender mailSender;
    @Mock
    private RedisValueService redisValueService;
    @Mock
    private MemberRepository memberRepository;

    private EmailVerificationService service;

    @BeforeEach
    void setUp() {
        EmailAuthProperties properties = new EmailAuthProperties();
        properties.setFrom("no-reply@example.com");
        properties.setCodeExpiration(Duration.ofMinutes(5));
        properties.setVerifiedExpiration(Duration.ofMinutes(10));
        service = new EmailVerificationService(mailSender, redisValueService, memberRepository, properties);
    }

    @Test
    @DisplayName("t1 이미 사용 중인 이메일로 회원가입 인증을 요청하면 메일을 발송하지 않는다")
    void t1_sendSignupCodeRejectsExistingEmail() {
        when(memberRepository.existsByEmail("user@example.com")).thenReturn(true);

        assertThatThrownBy(() -> service.sendCode("USER@example.com", EmailVerificationPurpose.SIGNUP))
                .isInstanceOf(BusinessException.class);

        verify(mailSender, never()).send(any(SimpleMailMessage.class));
    }

    @Test
    @DisplayName("t2 존재하지 않는 계정으로 비밀번호 재설정을 요청해도 성공처럼 처리하고 메일은 발송하지 않는다")
    void t2_sendPasswordResetCodeHidesMissingAccount() {
        when(memberRepository.findByEmailAndProvider("user@example.com", AuthProvider.LOCAL))
                .thenReturn(Optional.empty());

        service.sendCode("user@example.com", EmailVerificationPurpose.PASSWORD_RESET);

        verify(mailSender, never()).send(any(SimpleMailMessage.class));
    }

    @Test
    @DisplayName("t3 올바른 인증번호를 확인하면 번호를 삭제하고 인증 완료 상태를 저장한다")
    void t3_verifyCodeConsumesCodeAndStoresVerifiedState() {
        String codeKey = "email-verification-code:signup:user@example.com";
        String verifiedKey = "email-verification-verified:signup:user@example.com";
        when(redisValueService.get(codeKey)).thenReturn(Optional.of("123456"));

        service.verifyCode("user@example.com", "123456", EmailVerificationPurpose.SIGNUP);

        verify(redisValueService).delete(codeKey);
        verify(redisValueService).set(verifiedKey, "true", Duration.ofMinutes(10));
    }
}
