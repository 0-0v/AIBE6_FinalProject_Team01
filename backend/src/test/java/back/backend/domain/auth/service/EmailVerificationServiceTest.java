package back.backend.domain.auth.service;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import back.backend.domain.auth.config.EmailAuthProperties;
import back.backend.domain.auth.dto.EmailVerificationPurpose;
import back.backend.domain.auth.exception.EmailVerificationCooldownException;
import back.backend.domain.member.entity.AuthProvider;
import back.backend.domain.member.entity.Member;
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

@ExtendWith(MockitoExtension.class)
class EmailVerificationServiceTest {

    @Mock
    private SmtpEmailClient emailClient;
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
        properties.setResendCooldown(Duration.ofMinutes(5));
        service = new EmailVerificationService(emailClient, redisValueService, memberRepository, properties);
    }

    @Test
    @DisplayName("t1 이미 사용 중인 이메일로 회원가입 인증을 요청하면 메일을 발송하지 않는다")
    void t1_sendSignupCodeRejectsExistingEmail() {
        when(memberRepository.existsByEmail("user@example.com")).thenReturn(true);

        assertThatThrownBy(() -> service.sendCode("USER@example.com", EmailVerificationPurpose.SIGNUP))
                .isInstanceOf(BusinessException.class);

        verify(emailClient, never()).sendVerificationEmail(any(), any(), any(Long.class), any());
    }

    @Test
    @DisplayName("t2 존재하지 않는 계정으로 비밀번호 재설정을 요청하면 계정 없음 오류를 반환한다")
    void t2_sendPasswordResetCodeRejectsMissingAccount() {
        when(memberRepository.findByEmail("user@example.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() ->
                service.sendCode("user@example.com", EmailVerificationPurpose.PASSWORD_RESET))
                .isInstanceOf(BusinessException.class)
                .hasMessage("입력한 정보와 일치하는 Plamingo 계정이 없습니다.");

        verify(emailClient, never()).sendVerificationEmail(any(), any(), any(Long.class), any());
        verify(redisValueService, never()).setIfAbsent(any(), any(), any());
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

    @Test
    @DisplayName("t4 소셜 로그인 계정으로 비밀번호 재설정을 요청하면 전용 안내 예외가 발생한다")
    void t4_sendPasswordResetCodeRejectsSocialAccount() {
        Member socialMember =
                Member.create("user@naver.com", "카카오회원", null, AuthProvider.KAKAO, "kakao-1");
        when(memberRepository.findByEmail("user@naver.com")).thenReturn(Optional.of(socialMember));

        assertThatThrownBy(() ->
                service.sendCode("user@naver.com", EmailVerificationPurpose.PASSWORD_RESET))
                .isInstanceOf(BusinessException.class)
                .hasMessage("소셜로그인으로 가입된 계정입니다.");

        verify(emailClient, never()).sendVerificationEmail(any(), any(), any(Long.class), any());
    }

    @Test
    @DisplayName("t5 인증번호를 생성하면 Brevo 템플릿 메일과 Redis 만료 시간을 함께 설정한다")
    void t5_sendCodeUsesBrevoTemplate() {
        when(memberRepository.existsByEmail("user@example.com")).thenReturn(false);
        when(redisValueService.setIfAbsent(
                "email-verification-cooldown:signup:user@example.com",
                "true",
                Duration.ofMinutes(5)
        )).thenReturn(true);

        service.sendCode("USER@example.com", EmailVerificationPurpose.SIGNUP);

        verify(redisValueService).set(
                org.mockito.ArgumentMatchers.eq("email-verification-code:signup:user@example.com"),
                org.mockito.ArgumentMatchers.matches("\\d{6}"),
                org.mockito.ArgumentMatchers.eq(Duration.ofMinutes(5))
        );
        verify(emailClient).sendVerificationEmail(
                org.mockito.ArgumentMatchers.eq("user@example.com"),
                org.mockito.ArgumentMatchers.matches("\\d{6}"),
                org.mockito.ArgumentMatchers.eq(5L),
                org.mockito.ArgumentMatchers.eq(EmailVerificationPurpose.SIGNUP)
        );
    }

    @Test
    @DisplayName("t6 회원가입 인증번호를 5분 안에 재요청하면 추가 메일을 발송하지 않는다")
    void t6_signupResendDuringCooldownIsRejected() {
        when(memberRepository.existsByEmail("user@example.com")).thenReturn(false);
        when(redisValueService.setIfAbsent(
                "email-verification-cooldown:signup:user@example.com",
                "true",
                Duration.ofMinutes(5)
        )).thenReturn(false);
        when(redisValueService.remainingTtl(
                "email-verification-cooldown:signup:user@example.com"))
                .thenReturn(Optional.of(Duration.ofSeconds(157)));

        assertThatThrownBy(() ->
                service.sendCode("user@example.com", EmailVerificationPurpose.SIGNUP))
                .isInstanceOf(EmailVerificationCooldownException.class)
                .hasMessage("인증번호가 만료되었습니다. 잠시 후 다시 요청해 주세요.")
                .extracting("retryAfterSeconds")
                .isEqualTo(157L);

        verify(emailClient, never()).sendVerificationEmail(any(), any(), any(Long.class), any());
        verify(redisValueService).delete("email-verification-code:signup:user@example.com");
    }

    @Test
    @DisplayName("t7 존재하지 않는 계정에는 인증번호와 쿨다운을 저장하지 않는다")
    void t7_missingPasswordResetAccountDoesNotStoreVerificationState() {
        when(memberRepository.findByEmail("user@example.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() ->
                service.sendCode("user@example.com", EmailVerificationPurpose.PASSWORD_RESET))
                .isInstanceOf(BusinessException.class)
                .hasMessage("입력한 정보와 일치하는 Plamingo 계정이 없습니다.");

        verify(emailClient, never()).sendVerificationEmail(any(), any(), any(Long.class), any());
        verify(redisValueService, never()).set(any(), any(), any());
        verify(redisValueService, never()).setIfAbsent(any(), any(), any());
    }
}
