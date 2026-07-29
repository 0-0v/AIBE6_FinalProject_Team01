package back.backend.domain.member.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import back.backend.domain.member.entity.AuthProvider;
import back.backend.domain.member.entity.Member;
import back.backend.global.config.JpaConfig;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

@DataJpaTest
@ActiveProfiles("test")
@Import(JpaConfig.class)
@TestPropertySource(properties = "spring.jpa.hibernate.ddl-auto=create-drop")
class MemberRepositoryTest {

    @Autowired
    private MemberRepository memberRepository;

    @Test
    @DisplayName("t1 회원을 저장하면 식별자와 생성/수정 시각이 채번된다")
    void t1_saveAssignsIdAndTimestamps() {
        Member member = Member.create("user1@example.com", "닉네임1", null, AuthProvider.GOOGLE, "google-1");

        Member saved = memberRepository.saveAndFlush(member);

        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getCreatedAt()).isNotNull();
        assertThat(saved.getUpdatedAt()).isNotNull();
        assertThat(saved.getStatus()).isEqualTo(back.backend.domain.member.entity.MemberStatus.ACTIVE);
    }

    @Test
    @DisplayName("t2 provider와 providerId로 회원을 조회할 수 있다")
    void t2_findByProviderAndProviderIdReturnsMember() {
        memberRepository.saveAndFlush(Member.create("user2@example.com", "닉네임2", null, AuthProvider.KAKAO, "kakao-1"));

        Optional<Member> found = memberRepository.findByProviderAndProviderId(AuthProvider.KAKAO, "kakao-1");

        assertThat(found).isPresent();
        assertThat(found.get().getEmail()).isEqualTo("user2@example.com");
    }

    @Test
    @DisplayName("t3 존재하지 않는 provider/providerId 조합은 빈 결과를 반환한다")
    void t3_findByProviderAndProviderIdReturnsEmptyWhenNotFound() {
        Optional<Member> found = memberRepository.findByProviderAndProviderId(AuthProvider.NAVER, "not-exist");

        assertThat(found).isEmpty();
    }

    @Test
    @DisplayName("t4 이메일 등록 여부를 existsByEmail로 확인할 수 있다")
    void t4_existsByEmailReflectsRegistrationState() {
        memberRepository.saveAndFlush(Member.create("user4@example.com", "닉네임4", null, AuthProvider.GOOGLE, "google-4"));

        assertThat(memberRepository.existsByEmail("user4@example.com")).isTrue();
        assertThat(memberRepository.existsByEmail("unknown@example.com")).isFalse();
    }

    @Test
    @DisplayName("t5 서로 다른 provider라도 같은 이메일이면 중복 저장할 수 없다")
    void t5_sameEmailAcrossDifferentProvidersViolatesUniqueConstraint() {
        memberRepository.saveAndFlush(Member.create("dup@example.com", "닉네임5", null, AuthProvider.GOOGLE, "google-5"));

        assertThatThrownBy(() -> memberRepository.saveAndFlush(
                Member.create("dup@example.com", "닉네임6", null, AuthProvider.KAKAO, "kakao-6")))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    @DisplayName("t6 같은 provider와 providerId 조합을 중복 저장하면 예외가 발생한다")
    void t6_duplicateProviderAndProviderIdViolatesUniqueConstraint() {
        memberRepository.saveAndFlush(Member.create("user7@example.com", "닉네임7", null, AuthProvider.GOOGLE, "google-7"));

        assertThatThrownBy(() -> memberRepository.saveAndFlush(
                Member.create("user8@example.com", "닉네임8", null, AuthProvider.GOOGLE, "google-7")))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    @DisplayName("t7 서로 다른 provider라면 providerId 값이 같아도 각각 저장할 수 있다")
    void t7_sameProviderIdAcrossDifferentProvidersIsAllowed() {
        memberRepository.saveAndFlush(Member.create("user9@example.com", "닉네임9", null, AuthProvider.GOOGLE, "same-id"));

        Member saved = memberRepository.saveAndFlush(
                Member.create("user10@example.com", "닉네임10", null, AuthProvider.KAKAO, "same-id"));

        assertThat(saved.getId()).isNotNull();
    }
}
