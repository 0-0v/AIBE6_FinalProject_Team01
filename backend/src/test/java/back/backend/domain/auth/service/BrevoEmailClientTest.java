package back.backend.domain.auth.service;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;
import static org.hamcrest.Matchers.containsString;

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
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

class BrevoEmailClientTest {

    private MockRestServiceServer server;
    private BrevoEmailClient client;

    @BeforeEach
    void setUp() {
        EmailAuthProperties properties = new EmailAuthProperties();
        properties.setBrevoApiKey("test-api-key");
        properties.setFrom("noreply@plamingo.example");
        properties.setVerificationTemplateId(42L);
        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        client = new BrevoEmailClient(builder, properties);
    }

    @Test
    @DisplayName("t1 인증 메일 발송 시 템플릿 ID와 인증 파라미터를 Brevo API로 전송한다")
    void t1_sendVerificationEmailUsesConfiguredTemplate() {
        server.expect(requestTo("https://api.brevo.com/v3/smtp/email"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("api-key", "test-api-key"))
                .andExpect(content().json("""
                        {
                          "to": [{"email": "user@example.com"}],
                          "templateId": 42,
                          "params": {
                            "code": "123456",
                            "expirationMinutes": 5,
                            "purpose": "SIGNUP"
                          }
                        }
                        """))
                .andRespond(withSuccess("{\"messageId\":\"test-message-id\"}", MediaType.APPLICATION_JSON));

        client.sendVerificationEmail(
                "user@example.com",
                "123456",
                5L,
                EmailVerificationPurpose.SIGNUP
        );

        server.verify();
    }

    @Test
    @DisplayName("t2 Brevo API 호출이 실패하면 이메일 발송 실패 예외로 변환한다")
    void t2_sendVerificationEmailConvertsApiFailure() {
        server.expect(requestTo("https://api.brevo.com/v3/smtp/email"))
                .andRespond(withStatus(HttpStatus.SERVICE_UNAVAILABLE));

        assertThatThrownBy(() -> client.sendVerificationEmail(
                "user@example.com",
                "123456",
                5L,
                EmailVerificationPurpose.SIGNUP
        ))
                .isInstanceOf(BusinessException.class)
                .satisfies(exception -> org.assertj.core.api.Assertions.assertThat(
                        ((BusinessException) exception).getErrorCode()
                ).isEqualTo(AuthErrorCode.EMAIL_SEND_FAILED));
        server.verify();
    }

    @Test
    @DisplayName("t3 여행방 초대 메일 발송 시 플라밍고 HTML과 참여 링크를 Brevo API로 전송한다")
    void t3_sendTripInvitationEmailUsesBrandedHtml() {
        server.expect(requestTo("https://api.brevo.com/v3/smtp/email"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(content().string(containsString("Plamingo")))
                .andExpect(content().string(containsString("https://plamingo.example/trip-invite/token")))
                .andRespond(withSuccess("{\"messageId\":\"test-message-id\"}", MediaType.APPLICATION_JSON));

        client.sendTripInvitationEmail(
                "friend@example.com", "친구", "방장", "제주 여행",
                "https://plamingo.example/trip-invite/token", 7L);

        server.verify();
    }

    @Test
    @DisplayName("t4 Brevo API 키가 없으면 설정된 SMTP로 여행방 초대 HTML 메일을 발송한다")
    void t4_sendTripInvitationEmailFallsBackToSmtp() {
        EmailAuthProperties properties = new EmailAuthProperties();
        properties.setFrom("noreply@plamingo.example");
        JavaMailSender mailSender = mock(JavaMailSender.class);
        MimeMessage message = new MimeMessage(Session.getInstance(new Properties()));
        when(mailSender.createMimeMessage()).thenReturn(message);
        BrevoEmailClient smtpClient = new BrevoEmailClient(
                RestClient.builder(), properties, mailSender);

        smtpClient.sendTripInvitationEmail(
                "friend@example.com", "친구", "방장", "제주 여행",
                "https://plamingo.example/trip-invite/token", 7L);

        verify(mailSender).send(message);
    }

    @Test
    @DisplayName("t5 관리자 OTP는 Brevo API 키 없이 기존 SMTP 설정으로 발송한다")
    void t5_sendAdminOtpUsesSmtpWithoutApiKey() {
        EmailAuthProperties properties = new EmailAuthProperties();
        properties.setFrom("noreply@plamingo.example");
        JavaMailSender mailSender = mock(JavaMailSender.class);
        MimeMessage message = new MimeMessage(Session.getInstance(new Properties()));
        when(mailSender.createMimeMessage()).thenReturn(message);
        BrevoEmailClient smtpClient = new BrevoEmailClient(
                RestClient.builder(), properties, mailSender);

        smtpClient.sendAdminOtpEmail("admin@example.com", "123456", 5L);

        verify(mailSender).send(message);
    }
}
