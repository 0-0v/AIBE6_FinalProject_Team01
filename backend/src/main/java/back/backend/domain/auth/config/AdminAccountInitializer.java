package back.backend.domain.auth.config;

import back.backend.domain.member.entity.AuthProvider;
import back.backend.domain.member.entity.Member;
import back.backend.domain.member.entity.MemberRole;
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
        Member member = findOrCreateAdmin(email, username, passwordHash);
        member.releaseSuspension();
        memberRepository.save(member);
    }

    private Member findOrCreateAdmin(String email, String username, String passwordHash) {
        Member emailOwner = memberRepository.findByEmail(email).orElse(null);
        if (emailOwner != null) {
            if (emailOwner.getProvider() != AuthProvider.LOCAL
                    || emailOwner.getRole() != MemberRole.ADMIN) {
                throw new IllegalStateException("ADMIN_EMAIL은 가입되지 않은 관리자 전용 이메일이어야 합니다.");
            }
            emailOwner.reconfigureAdminLocalIdentity(email, username, passwordHash);
            return emailOwner;
        }

        Member usernameOwner = memberRepository
                .findByNicknameAndProvider(username, AuthProvider.LOCAL)
                .orElse(null);
        if (usernameOwner != null) {
            if (usernameOwner.getRole() != MemberRole.ADMIN) {
                throw new IllegalStateException("ADMIN_USERNAME은 일반 회원이 사용하지 않는 값이어야 합니다.");
            }
            usernameOwner.reconfigureAdminLocalIdentity(email, username, passwordHash);
            return usernameOwner;
        }

        Member created = Member.createLocal(email, username, passwordHash);
        created.promoteToAdmin();
        return created;
    }
}
