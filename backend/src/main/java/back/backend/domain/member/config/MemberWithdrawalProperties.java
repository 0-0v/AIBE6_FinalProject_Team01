package back.backend.domain.member.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.member.withdrawal")
public class MemberWithdrawalProperties {

    private int retentionDays = 90;

    public int getRetentionDays() {
        return retentionDays;
    }

    public void setRetentionDays(int retentionDays) {
        if (retentionDays < 0) {
            throw new IllegalArgumentException("회원 탈퇴 개인정보 보관기간은 0일 이상이어야 합니다.");
        }
        this.retentionDays = retentionDays;
    }
}
