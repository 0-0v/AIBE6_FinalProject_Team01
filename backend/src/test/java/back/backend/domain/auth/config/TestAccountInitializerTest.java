package back.backend.domain.auth.config;

import back.backend.domain.member.entity.AuthProvider;
import back.backend.domain.member.entity.Member;
import back.backend.domain.member.repository.MemberRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TestAccountInitializerTest {

    @Mock
    private MemberRepository memberRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Test
    @DisplayName("t1 애플리케이션 시작 시 심사용 테스트 계정 두 개를 생성한다")
    void t1_createsTwoReviewAccountsOnStartup() throws Exception {
        when(memberRepository.findByEmailAndProvider(any(), any()))
                .thenReturn(Optional.empty());
        when(passwordEncoder.encode("PlamingoTest1!"))
                .thenReturn("encoded-password");
        TestAccountInitializer initializer = new TestAccountInitializer(
                memberRepository,
                passwordEncoder
        );

        initializer.run(new DefaultApplicationArguments(new String[0]));

        ArgumentCaptor<Member> captor = ArgumentCaptor.forClass(Member.class);
        verify(memberRepository, org.mockito.Mockito.times(2))
                .save(captor.capture());
        assertThat(captor.getAllValues())
                .extracting(Member::getNickname)
                .containsExactly("테스트유저1", "테스트유저2");
        assertThat(captor.getAllValues())
                .extracting(Member::getEmail)
                .containsExactly(
                        "test-user-1@plamingo.app",
                        "test-user-2@plamingo.app"
                );
    }
}
