package back.backend.global.security.oauth2;

public interface OAuth2UserInfo {

    String providerId();

    String email();

    String nickname();

    String profileImageUrl();
}
