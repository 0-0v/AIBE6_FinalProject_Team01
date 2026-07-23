package back.backend.global.security.oauth2;

import java.util.Map;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;

public record GoogleOAuth2UserInfo(String providerId, String email, String nickname)
        implements OAuth2UserInfo {

    public static GoogleOAuth2UserInfo from(Map<String, Object> attributes) {
        Object id = attributes.get("sub");
        String email = (String) attributes.get("email");
        String nickname = (String) attributes.get("name");

        if (id == null || email == null || nickname == null) {
            throw new OAuth2AuthenticationException("구글 로그인에 이메일과 이름 동의가 필요합니다.");
        }

        return new GoogleOAuth2UserInfo(String.valueOf(id), email, nickname);
    }

    @Override
    public String profileImageUrl() {
        return null;
    }
}
