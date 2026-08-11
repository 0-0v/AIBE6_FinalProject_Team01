package back.backend.domain.auth.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import back.backend.domain.auth.config.EmailAuthProperties;
import back.backend.domain.auth.dto.EmailVerificationPurpose;
import back.backend.domain.auth.exception.AuthErrorCode;
import back.backend.global.exception.BusinessException;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import java.util.Properties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;

class SmtpEmailClientTest {

    private JavaMailSender mailSender;
    private MimeMessage message;
    private SmtpEmailClient client;

    @BeforeEach
    void setUp() {
        EmailAuthProperties properties = new EmailAuthProperties();
        properties.setFrom("noreply@plamingo.example");
        mailSender = mock(JavaMailSender.class);
        message = new MimeMessage(Session.getInstance(new Properties()));
        when(mailSender.createMimeMessage()).thenReturn(message);
        client = new SmtpEmailClient(properties, mailSender);
    }

    @Test
    @DisplayName("t1 API 키 없이 SMTP로 회원가입 인증 메일을 발송한다")
    void t1_sendVerificationEmailUsesSmtpWithoutApiKey() throws Exception {
        client.sendVerificationEmail(
                "user@example.com", "123456", 5L, EmailVerificationPurpose.SIGNUP);

        verify(mailSender).send(message);
        assertThat(message.getSubject()).contains("인증번호");
        assertThat(message.getContent().toString()).contains("123456");
    }

    @Test
    @DisplayName("t2 SMTP 발송 실패를 이메일 발송 실패 예외로 변환한다")
    void t2_sendVerificationEmailConvertsSmtpFailure() {
        org.mockito.Mockito.doThrow(new MailSendException("failed"))
                .when(mailSender).send(message);

        assertThatThrownBy(() -> client.sendVerificationEmail(
                "user@example.com", "123456", 5L, EmailVerificationPurpose.SIGNUP))
                .isInstanceOf(BusinessException.class)
                .satisfies(exception -> assertThat(((BusinessException) exception).getErrorCode())
                        .isEqualTo(AuthErrorCode.EMAIL_SEND_FAILED));
    }

    @Test
    @DisplayName("t3 API 키 없이 SMTP로 여행방 초대 메일을 발송한다")
    void t3_sendTripInvitationEmailUsesSmtpWithoutApiKey() {
        client.sendTripInvitationEmail(
                "friend@example.com", "친구", "방장", "제주 여행",
                "https://plamingo.example/trip-invite/token", 7L);

        verify(mailSender).send(message);
    }

    @Test
    @DisplayName("t4 API 키 없이 SMTP로 관리자 OTP 메일을 발송한다")
    void t4_sendAdminOtpEmailUsesSmtpWithoutApiKey() {
        client.sendAdminOtpEmail("admin@example.com", "123456", 5L);

        verify(mailSender).send(message);
    }
}
