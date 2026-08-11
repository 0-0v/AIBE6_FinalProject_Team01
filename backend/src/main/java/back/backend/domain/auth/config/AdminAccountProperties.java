package back.backend.domain.auth.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.auth.admin-account")
public class AdminAccountProperties {

    private boolean enabled;
    private String username = "admin12";
    private String email;
    private String password;

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public void validate() {
        if (!enabled) {
            return;
        }
        if (isBlank(username) || isBlank(email) || isBlank(password)) {
            throw new IllegalStateException("관리자 계정 환경변수가 모두 설정되어야 합니다.");
        }
        if (password.length() < 12) {
            throw new IllegalStateException("관리자 비밀번호는 12자 이상이어야 합니다.");
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
