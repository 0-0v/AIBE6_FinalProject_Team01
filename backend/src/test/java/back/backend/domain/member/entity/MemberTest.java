package back.backend.domain.member.entity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class MemberTest {

    @Test
    @DisplayName("t1 재로그인하면 닉네임, 프로필 이미지, 마지막 로그인 시각이 갱신된다")
    void t1_recordLoginUpdatesNicknameProfileImageAndLastLoginAt() {
        Member member = Member.create("user1@example.com", "기존닉네임", "old-image-url", AuthProvider.KAKAO, "kakao-1");

        member.recordLogin("새닉네임", "new-image-url");

        assertThat(member.getNickname()).isEqualTo("새닉네임");
        assertThat(member.getProfileImageUrl()).isEqualTo("new-image-url");
        assertThat(member.getLastLoginAt()).isNotNull();
    }

    @Test
    @DisplayName("t2 닉네임 없이 재로그인을 기록하면 예외가 발생한다")
    void t2_recordLoginThrowsWhenNicknameIsNull() {
        Member member = Member.create("user2@example.com", "닉네임2", null, AuthProvider.KAKAO, "kakao-2");

        assertThatThrownBy(() -> member.recordLogin(null, "image-url"))
                .isInstanceOf(NullPointerException.class);
    }
}
