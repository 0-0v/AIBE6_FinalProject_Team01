package back.backend.global.security.oauth2;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.auth.oauth2-token")
public class OAuth2TokenProperties {

    private String encryptionKey;
    private Duration retention = Duration.ofDays(3650);
    private String kakaoAdminKey;
    private Duration connectTimeout = Duration.ofSeconds(3);
    private Duration readTimeout = Duration.ofSeconds(5);

    public String getEncryptionKey() {
        return encryptionKey;
    }

    public void setEncryptionKey(String encryptionKey) {
        this.encryptionKey = encryptionKey;
    }

    public Duration getRetention() {
        return retention;
    }

    public void setRetention(Duration retention) {
        this.retention = retention;
    }

    public String getKakaoAdminKey() {
        return kakaoAdminKey;
    }

    public void setKakaoAdminKey(String kakaoAdminKey) {
        this.kakaoAdminKey = kakaoAdminKey;
    }

    public boolean isEncryptionConfigured() {
        return encryptionKey != null && !encryptionKey.isBlank();
    }

    public Duration getConnectTimeout() {
        return connectTimeout;
    }

    public void setConnectTimeout(Duration connectTimeout) {
        this.connectTimeout = connectTimeout;
    }

    public Duration getReadTimeout() {
        return readTimeout;
    }

    public void setReadTimeout(Duration readTimeout) {
        this.readTimeout = readTimeout;
    }
}
