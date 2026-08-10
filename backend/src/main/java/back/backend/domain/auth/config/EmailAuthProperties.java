package back.backend.domain.auth.config;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app.auth.email")
public class EmailAuthProperties {
    private String from;
    private String brevoApiKey;
    private Long verificationTemplateId;
    private Duration codeExpiration = Duration.ofMinutes(5);
    private Duration verifiedExpiration = Duration.ofMinutes(10);
    private Duration adminOtpExpiration = Duration.ofMinutes(5);
    private Duration adminOtpResendInterval = Duration.ofSeconds(60);

    public String getFrom() { return from; }
    public void setFrom(String from) { this.from = from; }
    public String getBrevoApiKey() { return brevoApiKey; }
    public void setBrevoApiKey(String brevoApiKey) { this.brevoApiKey = brevoApiKey; }
    public Long getVerificationTemplateId() { return verificationTemplateId; }
    public void setVerificationTemplateId(Long verificationTemplateId) {
        this.verificationTemplateId = verificationTemplateId;
    }
    public Duration getCodeExpiration() { return codeExpiration; }
    public void setCodeExpiration(Duration codeExpiration) { this.codeExpiration = codeExpiration; }
    public Duration getVerifiedExpiration() { return verifiedExpiration; }
    public void setVerifiedExpiration(Duration verifiedExpiration) { this.verifiedExpiration = verifiedExpiration; }
    public Duration getAdminOtpExpiration() { return adminOtpExpiration; }
    public void setAdminOtpExpiration(Duration adminOtpExpiration) { this.adminOtpExpiration = adminOtpExpiration; }
    public Duration getAdminOtpResendInterval() { return adminOtpResendInterval; }
    public void setAdminOtpResendInterval(Duration adminOtpResendInterval) { this.adminOtpResendInterval = adminOtpResendInterval; }
}
