package back.backend.domain.auth.service;

import back.backend.domain.auth.config.EmailAuthProperties;
import back.backend.domain.auth.dto.EmailVerificationPurpose;
import back.backend.domain.auth.exception.AuthErrorCode;
import back.backend.global.exception.BusinessException;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.util.HtmlUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Component
public class BrevoEmailClient {
    private static final String BREVO_BASE_URL = "https://api.brevo.com/v3";

    private final RestClient restClient;
    private final EmailAuthProperties properties;
    private final JavaMailSender mailSender;

    @Autowired
    public BrevoEmailClient(EmailAuthProperties properties, JavaMailSender mailSender) {
        this(createRestClientBuilder(), properties, mailSender);
    }

    BrevoEmailClient(RestClient.Builder builder, EmailAuthProperties properties) {
        this(builder, properties, null);
    }

    BrevoEmailClient(
            RestClient.Builder builder,
            EmailAuthProperties properties,
            JavaMailSender mailSender
    ) {
        this.restClient = builder.baseUrl(BREVO_BASE_URL).build();
        this.properties = properties;
        this.mailSender = mailSender;
    }

    public void sendVerificationEmail(
            String email,
            String code,
            long expirationMinutes,
            EmailVerificationPurpose purpose
    ) {
        validateConfiguration();
        SendTransactionalEmailRequest request = new SendTransactionalEmailRequest(
                List.of(new Recipient(email)),
                properties.getVerificationTemplateId(),
                Map.of(
                        "code", code,
                        "expirationMinutes", expirationMinutes,
                        "purpose", purpose.name()
                )
        );

        try {
            restClient.post()
                    .uri("/smtp/email")
                    .header("api-key", properties.getBrevoApiKey())
                    .accept(MediaType.APPLICATION_JSON)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(request)
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientException exception) {
            throw new BusinessException(AuthErrorCode.EMAIL_SEND_FAILED);
        }
    }

    public void sendTripInvitationEmail(
            String email,
            String inviteeNickname,
            String inviterNickname,
            String tripTitle,
            String invitationUrl,
            long expirationDays
    ) {
        if (!StringUtils.hasText(properties.getFrom())) {
            throw new BusinessException(AuthErrorCode.EMAIL_SEND_FAILED);
        }
        String html = invitationHtml(
                inviteeNickname, inviterNickname, tripTitle, invitationUrl, expirationDays);
        if (!StringUtils.hasText(properties.getBrevoApiKey())) {
            sendTripInvitationWithSmtp(email, tripTitle, html);
            return;
        }
        SendHtmlEmailRequest request = new SendHtmlEmailRequest(
                new Sender("Plamingo", properties.getFrom()),
                List.of(new Recipient(email)),
                "[Plamingo] " + tripTitle + " 여행에 초대받았어요",
                html
        );
        try {
            restClient.post()
                    .uri("/smtp/email")
                    .header("api-key", properties.getBrevoApiKey())
                    .accept(MediaType.APPLICATION_JSON)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(request)
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientException exception) {
            throw new BusinessException(AuthErrorCode.EMAIL_SEND_FAILED);
        }
    }

    public void sendAdminOtpEmail(String email, String code, long expirationMinutes) {
        if (!StringUtils.hasText(properties.getFrom())) {
            throw new BusinessException(AuthErrorCode.EMAIL_SEND_FAILED);
        }
        String html = """
                <!doctype html><html><body style="margin:0;background:#fff7f8;font-family:Arial,sans-serif;color:#213c51">
                <div style="max-width:520px;margin:32px auto;background:#fff;border:1px solid #f8d9df;border-radius:24px;overflow:hidden">
                  <div style="padding:26px;background:linear-gradient(135deg,#f3b8b1,#df5d76);color:#fff;font-size:24px;font-weight:700">Plamingo</div>
                  <div style="padding:32px"><h1 style="font-size:21px;margin:0 0 14px">관리자 로그인 인증</h1>
                  <p style="line-height:1.7;color:#475569">관리자 로그인을 계속하려면 아래 일회용 인증번호를 입력해 주세요.</p>
                  <div style="margin:24px 0;padding:18px;text-align:center;background:#fff1f3;border-radius:14px;font-size:32px;font-weight:800;letter-spacing:8px">%s</div>
                  <p style="font-size:12px;color:#94a3b8">인증번호는 %d분 동안 유효합니다. 본인이 요청하지 않았다면 이 메일을 무시해 주세요.</p></div>
                </div></body></html>
                """.formatted(code, expirationMinutes);
        sendAdminOtpWithSmtp(email, html);
    }

    public void sendInquiryReplyEmail(String email, String inquirySubject, String answer) {
        if (!StringUtils.hasText(properties.getFrom())) {
            throw new BusinessException(AuthErrorCode.EMAIL_SEND_FAILED);
        }
        String html = """
                <!doctype html><html><body style="margin:0;background:#fff7f8;font-family:Arial,sans-serif;color:#213c51">
                <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:24px;overflow:hidden;border:1px solid #f8d9df">
                  <div style="padding:28px;background:linear-gradient(135deg,#f3b8b1,#df5d76);color:#fff"><b style="font-size:24px">Plamingo</b></div>
                  <div style="padding:32px"><h1 style="font-size:22px;margin:0 0 12px">문의 답변이 도착했습니다</h1>
                  <p style="font-size:13px;color:#64748b;margin:0 0 20px">문의: %s</p>
                  <div style="padding:20px;background:#fff1f3;border-radius:14px;line-height:1.8;white-space:pre-wrap">%s</div>
                  <p style="margin-top:24px;font-size:12px;color:#94a3b8">본 메일은 Plamingo 서비스 문의에 대한 답변입니다.</p></div>
                </div></body></html>
                """.formatted(HtmlUtils.htmlEscape(inquirySubject), HtmlUtils.htmlEscape(answer));
        sendHtmlEmail(email, "[Plamingo] 문의 답변: " + inquirySubject, html);
    }

    private void sendHtmlEmail(String email, String subject, String html) {
        if (StringUtils.hasText(properties.getBrevoApiKey())) {
            SendHtmlEmailRequest request = new SendHtmlEmailRequest(
                    new Sender("Plamingo", properties.getFrom()),
                    List.of(new Recipient(email)), subject, html);
            try {
                restClient.post().uri("/smtp/email")
                        .header("api-key", properties.getBrevoApiKey())
                        .accept(MediaType.APPLICATION_JSON)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(request).retrieve().toBodilessEntity();
                return;
            } catch (RestClientException exception) {
                throw new BusinessException(AuthErrorCode.EMAIL_SEND_FAILED);
            }
        }
        if (mailSender == null) throw new BusinessException(AuthErrorCode.EMAIL_SEND_FAILED);
        try {
            var message = mailSender.createMimeMessage();
            var helper = new MimeMessageHelper(message, "UTF-8");
            helper.setFrom(properties.getFrom());
            helper.setTo(email);
            helper.setSubject(subject);
            helper.setText(html, true);
            mailSender.send(message);
        } catch (jakarta.mail.MessagingException | MailException exception) {
            throw new BusinessException(AuthErrorCode.EMAIL_SEND_FAILED);
        }
    }

    private void sendAdminOtpWithSmtp(String email, String html) {
        if (mailSender == null) {
            throw new BusinessException(AuthErrorCode.EMAIL_SEND_FAILED);
        }
        try {
            var message = mailSender.createMimeMessage();
            var helper = new MimeMessageHelper(message, "UTF-8");
            helper.setFrom(properties.getFrom());
            helper.setTo(email);
            helper.setSubject("[Plamingo] 관리자 로그인 인증번호");
            helper.setText(html, true);
            mailSender.send(message);
        } catch (jakarta.mail.MessagingException | MailException exception) {
            throw new BusinessException(AuthErrorCode.EMAIL_SEND_FAILED);
        }
    }

    private void sendTripInvitationWithSmtp(String email, String tripTitle, String html) {
        if (mailSender == null) {
            throw new BusinessException(AuthErrorCode.EMAIL_SEND_FAILED);
        }
        try {
            var message = mailSender.createMimeMessage();
            var helper = new MimeMessageHelper(message, "UTF-8");
            helper.setFrom(properties.getFrom());
            helper.setTo(email);
            helper.setSubject("[Plamingo] " + tripTitle + " 여행에 초대받았어요");
            helper.setText(html, true);
            mailSender.send(message);
        } catch (jakarta.mail.MessagingException | MailException exception) {
            throw new BusinessException(AuthErrorCode.EMAIL_SEND_FAILED);
        }
    }

    private String invitationHtml(String invitee, String inviter, String trip, String url, long days) {
        return """
                <!doctype html><html><body style="margin:0;background:#fff7f8;font-family:Arial,sans-serif;color:#213c51">
                <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:24px;overflow:hidden;border:1px solid #f8d9df">
                  <div style="padding:28px;background:linear-gradient(135deg,#f3b8b1,#df5d76);color:#fff"><b style="font-size:24px">Plamingo</b></div>
                  <div style="padding:32px"><h1 style="font-size:22px;margin:0 0 16px">여행 초대가 도착했어요</h1>
                  <p style="line-height:1.7">%s님, <b>%s</b>님이 <b>%s</b> 여행에 초대했어요.</p>
                  <a href="%s" style="display:block;margin:28px 0;padding:15px;text-align:center;background:#e7657a;color:#fff;text-decoration:none;border-radius:12px;font-weight:bold">초대받은 계정으로 참여하기</a>
                  <p style="font-size:12px;color:#94a3b8;line-height:1.6">이 링크는 %d일 동안 한 번만 사용할 수 있습니다. 본인이 요청하지 않은 초대라면 메일을 무시해 주세요.</p></div>
                </div></body></html>
                """.formatted(
                HtmlUtils.htmlEscape(invitee),
                HtmlUtils.htmlEscape(inviter),
                HtmlUtils.htmlEscape(trip),
                HtmlUtils.htmlEscape(url),
                days
        );
    }

    private void validateConfiguration() {
        if (!StringUtils.hasText(properties.getBrevoApiKey())
                || properties.getVerificationTemplateId() == null) {
            throw new IllegalStateException(
                    "BREVO_API_KEY와 BREVO_EMAIL_VERIFICATION_TEMPLATE_ID 설정이 필요합니다."
            );
        }
    }

    private static RestClient.Builder createRestClientBuilder() {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(3));
        requestFactory.setReadTimeout(Duration.ofSeconds(5));
        return RestClient.builder().requestFactory(requestFactory);
    }

    private record SendTransactionalEmailRequest(
            List<Recipient> to,
            Long templateId,
            Map<String, Object> params
    ) {
    }

    private record Recipient(String email) {
    }

    private record Sender(String name, String email) {
    }

    private record SendHtmlEmailRequest(
            Sender sender,
            List<Recipient> to,
            String subject,
            String htmlContent
    ) {
    }
}
