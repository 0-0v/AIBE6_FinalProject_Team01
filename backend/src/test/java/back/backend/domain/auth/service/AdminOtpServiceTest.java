package back.backend.domain.auth.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import back.backend.domain.auth.config.EmailAuthProperties;
import back.backend.domain.auth.dto.AdminOtpVerifyRequest;
import back.backend.domain.auth.dto.LoginRequest;
import back.backend.domain.auth.dto.TokenResponse;
import back.backend.domain.auth.exception.AuthErrorCode;
import back.backend.domain.member.entity.Member;
import back.backend.global.exception.BusinessException;
import back.backend.global.redis.RedisValueService;
import java.time.Duration;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class AdminOtpServiceTest {
    @Mock AuthService authService;
    @Mock BrevoEmailClient emailClient;
    @Mock RedisValueService redisValueService;
    @Mock PasswordEncoder passwordEncoder;
    AdminOtpService adminOtpService;

    @BeforeEach
    void setUp() {
        EmailAuthProperties properties = new EmailAuthProperties();
        properties.setAdminOtpExpiration(Duration.ofMinutes(5));
        properties.setAdminOtpResendInterval(Duration.ofMinutes(1));
        adminOtpService = new AdminOtpService(authService, emailClient, redisValueService,
                passwordEncoder, properties);
    }

    @Test
    @DisplayName("t1 관리자 자격 증명이 유효하면 OTP를 저장하고 관리자 이메일로 발송한다")
    void t1_requestStoresAndEmailsOtpForValidAdmin() {
        Member admin = Member.createLocal("admin@example.com", "admin12", "hash");
        admin.promoteToAdmin();
        ReflectionTestUtils.setField(admin, "id", 1L);
        LoginRequest request = new LoginRequest("admin12", "password");
        when(authService.requireAdminCredentials(request)).thenReturn(admin);
        when(passwordEncoder.encode(anyString())).thenReturn("otp-hash");

        var response = adminOtpService.request(request);

        assertThat(response.challengeToken()).isNotBlank();
        assertThat(response.maskedEmail()).isEqualTo("ad***@example.com");
        verify(emailClient).sendAdminOtpEmail(
                org.mockito.ArgumentMatchers.eq("admin@example.com"), anyString(),
                org.mockito.ArgumentMatchers.eq(5L));
    }

    @Test
    @DisplayName("t2 유효한 OTP를 확인하면 일회용 챌린지를 삭제하고 관리자 토큰을 발급한다")
    void t2_verifyConsumesChallengeAndIssuesTokens() {
        when(redisValueService.get("admin-login-otp:challenge"))
                .thenReturn(Optional.of("1|otp-hash|0"));
        when(passwordEncoder.matches("123456", "otp-hash")).thenReturn(true);
        when(authService.completeAdminLogin(1L)).thenReturn(new TokenResponse("access", "refresh"));

        TokenResponse response = adminOtpService.verify(new AdminOtpVerifyRequest("challenge", "123456"));

        assertThat(response.accessToken()).isEqualTo("access");
        verify(redisValueService).delete("admin-login-otp:challenge");
    }

    @Test
    @DisplayName("t3 잘못된 OTP를 다섯 번 입력하면 챌린지를 폐기한다")
    void t3_verifyDeletesChallengeAfterMaximumFailures() {
        when(redisValueService.get("admin-login-otp:challenge"))
                .thenReturn(Optional.of("1|otp-hash|4"));
        when(passwordEncoder.matches("000000", "otp-hash")).thenReturn(false);

        assertThatThrownBy(() -> adminOtpService.verify(
                new AdminOtpVerifyRequest("challenge", "000000")))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(AuthErrorCode.ADMIN_OTP_INVALID);
        verify(redisValueService).delete("admin-login-otp:challenge");
    }
}
