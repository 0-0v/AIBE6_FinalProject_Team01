package back.backend.global.security.oauth2;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;

class KakaoOAuth2UserInfoTest {

    private Map<String, Object> validAttributes() {
        return Map.of(
                "id", 12345L,
                "kakao_account", Map.of(
                        "email", "user@example.com",
                        "profile", Map.of(
                                "nickname", "닉네임",
                                "profile_image_url", "https://example.com/image.png"
                        )
                )
        );
    }

    @Test
    @DisplayName("t1 카카오 응답 속성에서 회원 식별자, 이메일, 닉네임, 프로필 이미지를 추출한다")
    void t1_fromExtractsProviderIdEmailNicknameAndProfileImage() {
        KakaoOAuth2UserInfo userInfo = KakaoOAuth2UserInfo.from(validAttributes());

        assertThat(userInfo.providerId()).isEqualTo("12345");
        assertThat(userInfo.email()).isEqualTo("user@example.com");
        assertThat(userInfo.nickname()).isEqualTo("닉네임");
        assertThat(userInfo.profileImageUrl()).isEqualTo("https://example.com/image.png");
    }

    @Test
    @DisplayName("t2 이메일 동의 정보가 없으면 인증 예외가 발생한다")
    void t2_missingEmailThrowsAuthenticationException() {
        Map<String, Object> attributes = Map.of(
                "id", 12345L,
                "kakao_account", Map.of(
                        "profile", Map.of("nickname", "닉네임")
                )
        );

        assertThatThrownBy(() -> KakaoOAuth2UserInfo.from(attributes))
                .isInstanceOf(OAuth2AuthenticationException.class);
    }

    @Test
    @DisplayName("t3 닉네임 동의 정보가 없으면 인증 예외가 발생한다")
    void t3_missingNicknameThrowsAuthenticationException() {
        Map<String, Object> attributes = Map.of(
                "id", 12345L,
                "kakao_account", Map.of("email", "user@example.com")
        );

        assertThatThrownBy(() -> KakaoOAuth2UserInfo.from(attributes))
                .isInstanceOf(OAuth2AuthenticationException.class);
    }
}
