package back.backend.domain.auth.config;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app.auth.login-attempt")
public class LoginAttemptProperties {
    private Duration window = Duration.ofMinutes(10);
    private int identifierMaxFailures = 5;
    private int ipMaxFailures = 30;
    private List<String> trustedProxies = new ArrayList<>(List.of("127.0.0.1", "::1"));

    public Duration getWindow() { return window; }
    public void setWindow(Duration window) { this.window = window; }
    public int getIdentifierMaxFailures() { return identifierMaxFailures; }
    public void setIdentifierMaxFailures(int identifierMaxFailures) {
        this.identifierMaxFailures = identifierMaxFailures;
    }
    public int getIpMaxFailures() { return ipMaxFailures; }
    public void setIpMaxFailures(int ipMaxFailures) { this.ipMaxFailures = ipMaxFailures; }
    public List<String> getTrustedProxies() { return trustedProxies; }
    public void setTrustedProxies(List<String> trustedProxies) {
        this.trustedProxies = trustedProxies == null ? List.of() : List.copyOf(trustedProxies);
    }
}
