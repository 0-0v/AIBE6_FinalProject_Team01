package back.backend.domain.auth.config;

import back.backend.domain.member.entity.AuthProvider;
import back.backend.domain.member.entity.Member;
import back.backend.domain.member.repository.MemberRepository;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
@Profile("!test")
@ConditionalOnProperty(
        prefix = "app.auth.test-accounts",
        name = "enabled",
        havingValue = "true",
        matchIfMissing = true
)
public class TestAccountInitializer implements ApplicationRunner {

    private static final String TEST_PASSWORD = "PlamingoTest1!";
    private static final List<TestAccount> TEST_ACCOUNTS = List.of(
            new TestAccount("test-user-1@plamingo.app", "테스트유저1"),
            new TestAccount("test-user-2@plamingo.app", "테스트유저2")
    );

    private final MemberRepository memberRepository;
    private final PasswordEncoder passwordEncoder;

    public TestAccountInitializer(
            MemberRepository memberRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.memberRepository = memberRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        TEST_ACCOUNTS.forEach(this::ensureAccount);
    }

    private void ensureAccount(TestAccount account) {
        String passwordHash = passwordEncoder.encode(TEST_PASSWORD);
        Member member = memberRepository
                .findByEmailAndProvider(account.email(), AuthProvider.LOCAL)
                .orElseGet(() -> Member.createLocal(
                        account.email(),
                        account.nickname(),
                        passwordHash
                ));
        member.changeNickname(account.nickname());
        member.changePassword(passwordHash);
        memberRepository.save(member);
    }

    private record TestAccount(String email, String nickname) {
    }
}
