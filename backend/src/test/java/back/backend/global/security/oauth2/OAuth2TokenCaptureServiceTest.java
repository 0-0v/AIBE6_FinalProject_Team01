package back.backend.global.security.oauth2;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import back.backend.domain.member.entity.AuthProvider;
import java.time.Instant;
import java.util.Map;
import java.util.Set;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClient;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClientService;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.OAuth2AccessToken;
import org.springframework.security.oauth2.core.OAuth2RefreshToken;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;

@ExtendWith(MockitoExtension.class)
class OAuth2TokenCaptureServiceTest {

    @Mock
    private OAuth2AuthorizedClientService authorizedClientService;

    @Mock
    private OAuth2TokenRepository tokenRepository;

    @Test
    @DisplayName("t1 소셜 로그인 성공 시 제공자의 액세스 토큰과 리프레시 토큰을 회원별로 저장한다")
    void t1_captureStoresProviderAccessAndRefreshTokens() {
        ClientRegistration registration = ClientRegistration.withRegistrationId("google")
                .clientId("client")
                .clientSecret("secret")
                .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
                .redirectUri("https://example.com/callback")
                .authorizationUri("https://accounts.google.com/o/oauth2/v2/auth")
                .tokenUri("https://oauth2.googleapis.com/token")
                .userInfoUri("https://openidconnect.googleapis.com/v1/userinfo")
                .userNameAttributeName("sub")
                .clientName("Google")
                .build();
        var principal = new DefaultOAuth2User(
                Set.of(new SimpleGrantedAuthority("ROLE_USER")),
                Map.of("sub", "google-user"),
                "sub");
        var authentication = new OAuth2AuthenticationToken(
                principal,
                principal.getAuthorities(),
                "google");
        Instant issuedAt = Instant.parse("2026-07-31T00:00:00Z");
        Instant expiresAt = issuedAt.plusSeconds(3600);
        var authorizedClient = new OAuth2AuthorizedClient(
                registration,
                authentication.getName(),
                new OAuth2AccessToken(
                        OAuth2AccessToken.TokenType.BEARER,
                        "google-access-token",
                        issuedAt,
                        expiresAt),
                new OAuth2RefreshToken("google-refresh-token", issuedAt));
        when(authorizedClientService.loadAuthorizedClient("google", authentication.getName()))
                .thenReturn(authorizedClient);
        OAuth2TokenProperties properties = new OAuth2TokenProperties();
        properties.setEncryptionKey("configured-for-unit-test");
        OAuth2TokenCaptureService service =
                new OAuth2TokenCaptureService(
                        Optional.of(authorizedClientService),
                        tokenRepository,
                        properties);

        service.capture(authentication, 15L);

        ArgumentCaptor<OAuth2ProviderToken> tokenCaptor =
                ArgumentCaptor.forClass(OAuth2ProviderToken.class);
        verify(tokenRepository).save(
                org.mockito.ArgumentMatchers.eq(15L),
                org.mockito.ArgumentMatchers.eq(AuthProvider.GOOGLE),
                tokenCaptor.capture());
        org.assertj.core.api.Assertions.assertThat(tokenCaptor.getValue().accessToken())
                .isEqualTo("google-access-token");
        org.assertj.core.api.Assertions.assertThat(tokenCaptor.getValue().refreshToken())
                .isEqualTo("google-refresh-token");
        org.assertj.core.api.Assertions.assertThat(tokenCaptor.getValue().accessTokenExpiresAt())
                .isEqualTo(expiresAt);
    }

    @Test
    @DisplayName("t2 암호화 키가 없으면 소셜 로그인을 막지 않고 OAuth 토큰 저장만 건너뛴다")
    void t2_captureSkipsStorageWhenEncryptionKeyIsMissing() {
        OAuth2TokenCaptureService service = new OAuth2TokenCaptureService(
                Optional.of(authorizedClientService),
                tokenRepository,
                new OAuth2TokenProperties());
        var principal = new DefaultOAuth2User(
                Set.of(new SimpleGrantedAuthority("ROLE_USER")),
                Map.of("sub", "google-user"),
                "sub");
        var authentication = new OAuth2AuthenticationToken(
                principal,
                principal.getAuthorities(),
                "google");

        service.capture(authentication, 16L);

        verifyNoInteractions(authorizedClientService, tokenRepository);
    }
}
