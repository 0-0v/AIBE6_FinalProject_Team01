package back.backend.domain.auth.dto;

public record AccessTokenResponse(String accessToken) {

    public static AccessTokenResponse from(TokenResponse tokenResponse) {
        return new AccessTokenResponse(tokenResponse.accessToken());
    }
}
