package back.backend.domain.member.entity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

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
}
