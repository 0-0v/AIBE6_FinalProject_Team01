package back.backend.domain.member.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(MemberWithdrawalProperties.class)
public class MemberConfig {
}
