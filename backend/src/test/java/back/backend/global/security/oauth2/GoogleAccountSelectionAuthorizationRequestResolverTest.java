package back.backend.global.security.oauth2;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;

class GoogleAccountSelectionAuthorizationRequestResolverTest {

    @Test
    @DisplayName("t1 Google 인증 요청에는 계정 선택과 재동의 및 오프라인 접근 파라미터를 추가한다")
    void t1_googleAuthorizationRequestIncludesOfflineConsentParameters() {
        OAuth2AuthorizationRequest request = authorizationRequest();

        OAuth2AuthorizationRequest customized =
                GoogleAccountSelectionAuthorizationRequestResolver.withAccountSelection(
                        request,
                        "google"
                );

        assertThat(customized.getAdditionalParameters())
                .containsEntry("prompt", "consent select_account")
                .containsEntry("access_type", "offline");
    }

    @Test
    @DisplayName("t2 Kakao 인증 요청에는 계정 선택 파라미터를 추가하지 않는다")
    void t2_kakaoAuthorizationRequestDoesNotIncludeGooglePrompt() {
        OAuth2AuthorizationRequest request = authorizationRequest();

        OAuth2AuthorizationRequest customized =
                GoogleAccountSelectionAuthorizationRequestResolver.withAccountSelection(
                        request,
                        "kakao"
                );

        assertThat(customized.getAdditionalParameters()).doesNotContainKey("prompt");
        assertThat(customized.getAdditionalParameters()).doesNotContainKey("access_type");
    }

    private OAuth2AuthorizationRequest authorizationRequest() {
        return OAuth2AuthorizationRequest.authorizationCode()
                .authorizationUri("https://example.com/oauth/authorize")
                .clientId("client")
                .redirectUri("https://plamingo.example/login/oauth2/code/google")
                .scopes(java.util.Set.of("openid"))
                .state("state")
                .additionalParameters(Map.of())
                .build();
    }
}
