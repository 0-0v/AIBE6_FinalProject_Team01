package back.backend.global.security.oauth2;

import java.util.Map;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;

public final class OAuth2UserInfoFactory {

    private static final String KAKAO = "kakao";
    private static final String GOOGLE = "google";

    private OAuth2UserInfoFactory() {
    }

    public static OAuth2UserInfo of(String registrationId, Map<String, Object> attributes) {
        return switch (registrationId) {
            case KAKAO -> KakaoOAuth2UserInfo.from(attributes);
            case GOOGLE -> GoogleOAuth2UserInfo.from(attributes);
            default -> throw new OAuth2AuthenticationException("지원하지 않는 로그인 제공자입니다: " + registrationId);
        };
    }
}
