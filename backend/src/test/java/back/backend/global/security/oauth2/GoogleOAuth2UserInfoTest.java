package back.backend.global.security.oauth2;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;

class GoogleOAuth2UserInfoTest {

    private Map<String, Object> validAttributes() {
        return Map.of(
                "sub", "67890",
                "email", "user@gmail.com",
                "name", "구글유저"
        );
    }

    @Test
    @DisplayName("t1 구글 응답 속성에서 회원 식별자, 이메일, 이름을 추출한다")
    void t1_fromExtractsProviderIdEmailAndNickname() {
        GoogleOAuth2UserInfo userInfo = GoogleOAuth2UserInfo.from(validAttributes());

        assertThat(userInfo.providerId()).isEqualTo("67890");
        assertThat(userInfo.email()).isEqualTo("user@gmail.com");
        assertThat(userInfo.nickname()).isEqualTo("구글유저");
        assertThat(userInfo.profileImageUrl()).isNull();
    }

    @Test
    @DisplayName("t2 이메일 정보가 없으면 인증 예외가 발생한다")
    void t2_missingEmailThrowsAuthenticationException() {
        Map<String, Object> attributes = Map.of(
                "sub", "67890",
                "name", "구글유저"
        );

        assertThatThrownBy(() -> GoogleOAuth2UserInfo.from(attributes))
                .isInstanceOf(OAuth2AuthenticationException.class);
    }

    @Test
    @DisplayName("t3 이름 정보가 없으면 인증 예외가 발생한다")
    void t3_missingNicknameThrowsAuthenticationException() {
        Map<String, Object> attributes = Map.of(
                "sub", "67890",
                "email", "user@gmail.com"
        );

        assertThatThrownBy(() -> GoogleOAuth2UserInfo.from(attributes))
                .isInstanceOf(OAuth2AuthenticationException.class);
    }
}
