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
        when(memberRepository.findByEmail("admin@plamingo.app")).thenReturn(Optional.empty());
        when(memberRepository.findByNicknameAndProvider("admin12", AuthProvider.LOCAL))
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

    @Test
    @DisplayName("t3 기존 admin12 관리자 계정이 있으면 중복 생성 없이 새 관리자 이메일로 갱신한다")
    void t3_existingAdminUsernameUpdatesIdentityWithoutDuplicateInsert() throws Exception {
        AdminAccountProperties properties = validProperties();
        Member existingAdmin = Member.createLocal(
                "old-admin@plamingo.app", "admin12", "old-password");
        existingAdmin.promoteToAdmin();
        when(memberRepository.findByEmail("admin@plamingo.app")).thenReturn(Optional.empty());
        when(memberRepository.findByNicknameAndProvider("admin12", AuthProvider.LOCAL))
                .thenReturn(Optional.of(existingAdmin));
        when(passwordEncoder.encode("StrongPassword1!")).thenReturn("encoded-password");
        AdminAccountInitializer initializer =
                new AdminAccountInitializer(properties, memberRepository, passwordEncoder);

        initializer.run(new DefaultApplicationArguments(new String[0]));

        assertThat(existingAdmin.getEmail()).isEqualTo("admin@plamingo.app");
        assertThat(existingAdmin.getProviderId()).isEqualTo("admin@plamingo.app");
        assertThat(existingAdmin.getPasswordHash()).isEqualTo("encoded-password");
        verify(memberRepository).save(existingAdmin);
    }

    @Test
    @DisplayName("t4 일반 회원이 admin12 닉네임을 사용 중이면 관리자 계정 생성을 거부한다")
    void t4_regularMemberUsingAdminUsernameIsRejected() {
        AdminAccountProperties properties = validProperties();
        Member regularMember = Member.createLocal(
                "member@plamingo.app", "admin12", "member-password");
        when(memberRepository.findByEmail("admin@plamingo.app")).thenReturn(Optional.empty());
        when(memberRepository.findByNicknameAndProvider("admin12", AuthProvider.LOCAL))
                .thenReturn(Optional.of(regularMember));
        when(passwordEncoder.encode("StrongPassword1!")).thenReturn("encoded-password");
        AdminAccountInitializer initializer =
                new AdminAccountInitializer(properties, memberRepository, passwordEncoder);

        assertThatThrownBy(() -> initializer.run(new DefaultApplicationArguments(new String[0])))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("ADMIN_USERNAME은 일반 회원이 사용하지 않는 값이어야 합니다.");
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
