package back.backend.domain.auth.config;

import back.backend.domain.member.entity.AuthProvider;
import back.backend.domain.member.entity.Member;
import back.backend.domain.member.repository.MemberRepository;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@Profile("!test")
@EnableConfigurationProperties(AdminAccountProperties.class)
@ConditionalOnProperty(prefix = "app.auth.admin-account", name = "enabled", havingValue = "true")
public class AdminAccountInitializer implements ApplicationRunner {

    private final AdminAccountProperties properties;
    private final MemberRepository memberRepository;
    private final PasswordEncoder passwordEncoder;

    public AdminAccountInitializer(
            AdminAccountProperties properties,
            MemberRepository memberRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.properties = properties;
        this.memberRepository = memberRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        properties.validate();
        String email = properties.getEmail().strip().toLowerCase();
        String username = properties.getUsername().strip();
        String passwordHash = passwordEncoder.encode(properties.getPassword());
        Member member = memberRepository.findByEmailAndProvider(email, AuthProvider.LOCAL)
                .orElseGet(() -> Member.createLocal(email, username, passwordHash));
        member.changeNickname(username);
        member.changePassword(passwordHash);
        member.releaseSuspension();
        member.promoteToAdmin();
        memberRepository.save(member);
    }
}
