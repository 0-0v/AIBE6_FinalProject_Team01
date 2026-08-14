package back.backend.domain.member.entity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalDateTime;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

class MemberTest {

    @Test
    @DisplayName("t1 재로그인하면 마지막 로그인 시각만 갱신되고 닉네임과 프로필 이미지는 유지된다")
    void t1_recordLoginUpdatesOnlyLastLoginAt() {
        Member member = Member.create("user1@example.com", "기존닉네임", "old-image-url", AuthProvider.KAKAO, "kakao-1");

        member.recordLogin();

        assertThat(member.getNickname()).isEqualTo("기존닉네임");
        assertThat(member.getProfileImageUrl()).isEqualTo("old-image-url");
        assertThat(member.getLastLoginAt()).isNotNull();
    }

    @Test
    @DisplayName("t2 닉네임을 변경하면 닉네임이 갱신된다")
    void t2_changeNicknameUpdatesNickname() {
        Member member = Member.create("user3@example.com", "기존닉네임", null, AuthProvider.KAKAO, "kakao-3");

        member.changeNickname("새닉네임");

        assertThat(member.getNickname()).isEqualTo("새닉네임");
    }

    @Test
    @DisplayName("t3 닉네임 없이 변경하면 예외가 발생한다")
    void t3_changeNicknameThrowsWhenNicknameIsNull() {
        Member member = Member.create("user4@example.com", "닉네임4", null, AuthProvider.KAKAO, "kakao-4");

        assertThatThrownBy(() -> member.changeNickname(null))
                .isInstanceOf(NullPointerException.class);
    }

    @Test
    @DisplayName("t4 프로필 이미지를 변경하면 프로필 이미지 URL이 갱신된다")
    void t4_changeProfileImageUpdatesProfileImageUrl() {
        Member member = Member.create("user5@example.com", "닉네임5", "old-image-url", AuthProvider.KAKAO, "kakao-5");

        member.changeProfileImage("new-image-url");

        assertThat(member.getProfileImageUrl()).isEqualTo("new-image-url");
    }

    @Test
    @DisplayName("t5 회원이 탈퇴하면 작성자 정보는 탈퇴한 사용자로 마스킹되고 개인정보 만료일이 설정된다")
    void t5_withdrawMasksPublicProfileAndSetsPrivacyExpiration() {
        Member member = Member.create(
                "user@example.com", "기존닉네임", "old-image-url", AuthProvider.GOOGLE, "google-1");
        LocalDateTime withdrawnAt = LocalDateTime.of(2026, 7, 29, 12, 0);

        member.withdraw(withdrawnAt, withdrawnAt.plusDays(90));

        assertThat(member.getStatus()).isEqualTo(MemberStatus.WITHDRAWN);
        assertThat(member.getNickname()).isEqualTo("탈퇴한 사용자");
        assertThat(member.getProfileImageUrl()).isNull();
        assertThat(member.getWithdrawnAt()).isEqualTo(withdrawnAt);
        assertThat(member.getPersonalInfoExpiresAt()).isEqualTo(withdrawnAt.plusDays(90));
    }

    @Test
    @DisplayName("t6 개인정보 보관기간이 끝난 회원을 익명화하면 식별정보가 제거된다")
    void t6_anonymizePersonalInfoRemovesIdentifiers() {
        Member member = Member.create(
                "user@example.com", "기존닉네임", "old-image-url", AuthProvider.GOOGLE, "google-1");
        ReflectionTestUtils.setField(member, "id", 7L);
        LocalDateTime expiredAt = LocalDateTime.of(2027, 7, 29, 12, 0);
        member.withdraw(expiredAt.minusDays(90), expiredAt);

        member.anonymizePersonalInfo(expiredAt);

        assertThat(member.getEmail()).isEqualTo("withdrawn-7@deleted.invalid");
        assertThat(member.getProviderId()).isEqualTo("withdrawn-7");
        assertThat(member.getPasswordHash()).isNull();
        assertThat(member.getEmailVerifiedAt()).isNull();
        assertThat(member.getLastLoginAt()).isNull();
        assertThat(member.getPersonalInfoDeletedAt()).isEqualTo(expiredAt);
    }

    @Test
    @DisplayName("t7 새 회원은 일반 사용자 역할과 활성 상태로 생성된다")
    void t7_newMemberStartsAsActiveUser() {
        Member member = Member.createLocal("user@example.com", "여행자", "hash");

        assertThat(member.getRole()).isEqualTo(MemberRole.USER);
        assertThat(member.getStatus()).isEqualTo(MemberStatus.ACTIVE);
    }

    @Test
    @DisplayName("t8 관리자로 승격하면 관리자 역할이 저장된다")
    void t8_promoteToAdminChangesRole() {
        Member member = Member.createLocal("admin@example.com", "admin12", "hash");

        member.promoteToAdmin();

        assertThat(member.getRole()).isEqualTo(MemberRole.ADMIN);
    }

    @Test
    @DisplayName("t9 활성 회원을 정지하면 사유와 기간 및 처리 관리자가 기록된다")
    void t9_suspendStoresModerationDetails() {
        Member member = Member.createLocal("user@example.com", "여행자", "hash");
        LocalDateTime suspendedAt = LocalDateTime.of(2026, 8, 10, 17, 0);
        LocalDateTime suspendedUntil = suspendedAt.plusDays(7);

        member.suspend(9L, "자동화 요청 반복", suspendedAt, suspendedUntil);

        assertThat(member.getStatus()).isEqualTo(MemberStatus.SUSPENDED);
        assertThat(member.getSuspensionReason()).isEqualTo("자동화 요청 반복");
        assertThat(member.getSuspendedBy()).isEqualTo(9L);
        assertThat(member.getSuspendedAt()).isEqualTo(suspendedAt);
        assertThat(member.getSuspendedUntil()).isEqualTo(suspendedUntil);
    }

    @Test
    @DisplayName("t10 정지를 해제하면 활성 상태로 돌아가고 현재 정지 정보가 제거된다")
    void t10_releaseSuspensionRestoresActiveStatus() {
        Member member = Member.createLocal("user@example.com", "여행자", "hash");
        LocalDateTime suspendedAt = LocalDateTime.of(2026, 8, 10, 17, 0);
        member.suspend(9L, "자동화 요청 반복", suspendedAt, null);

        member.releaseSuspension();

        assertThat(member.getStatus()).isEqualTo(MemberStatus.ACTIVE);
        assertThat(member.getSuspensionReason()).isNull();
        assertThat(member.getSuspendedBy()).isNull();
        assertThat(member.getSuspendedAt()).isNull();
        assertThat(member.getSuspendedUntil()).isNull();
    }

    @Test
    @DisplayName("t11 비밀번호를 변경하면 기존 토큰을 무효화한다")
    void t11_changePasswordInvalidatesExistingTokens() {
        Member member = Member.createLocal("user@example.com", "여행자", "old-hash");

        member.changePassword("new-hash");

        assertThat(member.getTokenVersion()).isEqualTo(1L);
    }

    @Test
    @DisplayName("t12 회원을 정지하면 기존 토큰을 무효화한다")
    void t12_suspendInvalidatesExistingTokens() {
        Member member = Member.createLocal("user@example.com", "여행자", "hash");
        LocalDateTime suspendedAt = LocalDateTime.of(2026, 8, 14, 10, 0);

        member.suspend(9L, "보안 정책 위반", suspendedAt, suspendedAt.plusDays(1));

        assertThat(member.getTokenVersion()).isEqualTo(1L);
    }

    @Test
    @DisplayName("t13 관리자 비밀번호를 재설정하면 기존 토큰을 무효화한다")
    void t13_reconfigureAdminLocalIdentityInvalidatesExistingTokens() {
        Member member = Member.createLocal("admin@example.com", "관리자", "old-hash");
        member.promoteToAdmin();

        member.reconfigureAdminLocalIdentity("admin@example.com", "관리자", "new-hash");

        assertThat(member.getTokenVersion()).isEqualTo(1L);
    }
}
