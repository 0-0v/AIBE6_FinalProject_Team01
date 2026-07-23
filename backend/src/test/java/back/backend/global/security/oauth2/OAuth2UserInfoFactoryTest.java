package back.backend.global.security.oauth2;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;

class OAuth2UserInfoFactoryTest {

    @Test
    @DisplayName("t1 카카오 등록 아이디면 KakaoOAuth2UserInfo를 생성한다")
    void t1_kakaoRegistrationIdCreatesKakaoUserInfo() {
        Map<String, Object> attributes = Map.of(
                "id", 12345L,
                "kakao_account", Map.of(
                        "email", "user@example.com",
                        "profile", Map.of("nickname", "닉네임")
                )
        );

        OAuth2UserInfo userInfo = OAuth2UserInfoFactory.of("kakao", attributes);

        assertThat(userInfo).isInstanceOf(KakaoOAuth2UserInfo.class);
    }

    @Test
    @DisplayName("t2 구글 등록 아이디면 GoogleOAuth2UserInfo를 생성한다")
    void t2_googleRegistrationIdCreatesGoogleUserInfo() {
        Map<String, Object> attributes = Map.of(
                "sub", "67890",
                "email", "user@gmail.com",
                "name", "구글유저"
        );

        OAuth2UserInfo userInfo = OAuth2UserInfoFactory.of("google", attributes);

        assertThat(userInfo).isInstanceOf(GoogleOAuth2UserInfo.class);
    }

    @Test
    @DisplayName("t3 지원하지 않는 등록 아이디면 인증 예외가 발생한다")
    void t3_unsupportedRegistrationIdThrowsAuthenticationException() {
        assertThatThrownBy(() -> OAuth2UserInfoFactory.of("facebook", Map.of()))
                .isInstanceOf(OAuth2AuthenticationException.class);
    }
}
