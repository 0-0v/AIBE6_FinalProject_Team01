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
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Component
public class BrevoEmailClient {
    private static final String BREVO_BASE_URL = "https://api.brevo.com/v3";

    private final RestClient restClient;
    private final EmailAuthProperties properties;

    @Autowired
    public BrevoEmailClient(EmailAuthProperties properties) {
        this(createRestClientBuilder(), properties);
    }

    BrevoEmailClient(RestClient.Builder builder, EmailAuthProperties properties) {
        this.restClient = builder.baseUrl(BREVO_BASE_URL).build();
        this.properties = properties;
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
}
