package back.backend.global.security.oauth2;

import java.util.Map;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;

public record KakaoOAuth2UserInfo(String providerId, String email, String nickname, String profileImageUrl) {

    @SuppressWarnings("unchecked")
    public static KakaoOAuth2UserInfo from(Map<String, Object> attributes) {
        Object id = attributes.get("id");
        Map<String, Object> kakaoAccount = (Map<String, Object>) attributes.get("kakao_account");
        Map<String, Object> profile = kakaoAccount != null ? (Map<String, Object>) kakaoAccount.get("profile") : null;

        String email = kakaoAccount != null ? (String) kakaoAccount.get("email") : null;
        String nickname = profile != null ? (String) profile.get("nickname") : null;
        String profileImageUrl = profile != null ? (String) profile.get("profile_image_url") : null;

        if (id == null || email == null || nickname == null) {
            throw new OAuth2AuthenticationException("카카오 로그인에 이메일과 닉네임 동의가 필요합니다.");
        }

        return new KakaoOAuth2UserInfo(String.valueOf(id), email, nickname, profileImageUrl);
    }
}
