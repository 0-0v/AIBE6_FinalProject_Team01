package back.backend.domain.auth.config;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app.auth.email")
public class EmailAuthProperties {
    private String from;
    private Duration codeExpiration = Duration.ofMinutes(5);
    private Duration verifiedExpiration = Duration.ofMinutes(10);

    public String getFrom() { return from; }
    public void setFrom(String from) { this.from = from; }
    public Duration getCodeExpiration() { return codeExpiration; }
    public void setCodeExpiration(Duration codeExpiration) { this.codeExpiration = codeExpiration; }
    public Duration getVerifiedExpiration() { return verifiedExpiration; }
    public void setVerifiedExpiration(Duration verifiedExpiration) { this.verifiedExpiration = verifiedExpiration; }
}
