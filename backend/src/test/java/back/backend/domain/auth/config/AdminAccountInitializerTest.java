package back.backend.domain.auth.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import back.backend.domain.member.entity.AuthProvider;
import back.backend.domain.member.entity.Member;
import back.backend.domain.member.entity.MemberRole;
import back.backend.domain.member.repository.MemberRepository;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class AdminAccountInitializerTest {

    @Mock
    private MemberRepository memberRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Test
    @DisplayName("t1 관리자 환경변수가 유효하면 비밀번호를 해시하고 관리자 역할로 저장한다")
    void t1_validPropertiesCreateAdminWithEncodedPassword() throws Exception {
        AdminAccountProperties properties = validProperties();
        when(memberRepository.findByEmailAndProvider("admin@plamingo.app", AuthProvider.LOCAL))
                .thenReturn(Optional.empty());
        when(passwordEncoder.encode("StrongPassword1!"))
                .thenReturn("encoded-password");
        AdminAccountInitializer initializer =
                new AdminAccountInitializer(properties, memberRepository, passwordEncoder);

        initializer.run(new DefaultApplicationArguments(new String[0]));

        ArgumentCaptor<Member> captor = ArgumentCaptor.forClass(Member.class);
        verify(memberRepository).save(captor.capture());
        assertThat(captor.getValue().getNickname()).isEqualTo("admin12");
        assertThat(captor.getValue().getPasswordHash()).isEqualTo("encoded-password");
        assertThat(captor.getValue().getRole()).isEqualTo(MemberRole.ADMIN);
    }

    @Test
    @DisplayName("t2 관리자 비밀번호가 12자보다 짧으면 초기화를 거부한다")
    void t2_shortPasswordIsRejected() {
        AdminAccountProperties properties = validProperties();
        properties.setPassword("Short1!");

        assertThatThrownBy(properties::validate)
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("관리자 비밀번호는 12자 이상이어야 합니다.");
    }

    private AdminAccountProperties validProperties() {
        AdminAccountProperties properties = new AdminAccountProperties();
        properties.setEnabled(true);
        properties.setUsername("admin12");
        properties.setEmail("admin@plamingo.app");
        properties.setPassword("StrongPassword1!");
        return properties;
    }
}
