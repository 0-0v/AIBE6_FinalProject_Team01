package back.backend.global.security.oauth2;

import back.backend.domain.member.entity.AuthProvider;
import java.util.Locale;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClient;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClientService;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.stereotype.Service;

@Service
public class OAuth2TokenCaptureService {

    private static final Logger log = LoggerFactory.getLogger(OAuth2TokenCaptureService.class);

    private final Optional<OAuth2AuthorizedClientService> authorizedClientService;
    private final OAuth2TokenRepository tokenRepository;
    private final OAuth2TokenProperties properties;

    public OAuth2TokenCaptureService(
            Optional<OAuth2AuthorizedClientService> authorizedClientService,
            OAuth2TokenRepository tokenRepository,
            OAuth2TokenProperties properties
    ) {
        this.authorizedClientService = authorizedClientService;
        this.tokenRepository = tokenRepository;
        this.properties = properties;
    }

    public void capture(Authentication authentication, Long memberId) {
        if (!(authentication instanceof OAuth2AuthenticationToken oAuth2Authentication)) {
            return;
        }
        if (!properties.isEncryptionConfigured()) {
            log.warn("OAuth provider token storage is disabled because OAUTH_TOKEN_ENCRYPTION_KEY is not configured");
            return;
        }
        String registrationId = oAuth2Authentication.getAuthorizedClientRegistrationId();
        OAuth2AuthorizedClient authorizedClient = authorizedClientService
                .orElseThrow(() -> new IllegalStateException("OAuth authorized client service is not configured"))
                .loadAuthorizedClient(
                registrationId,
                oAuth2Authentication.getName());
        if (authorizedClient == null) {
            throw new IllegalStateException("OAuth authorized client was not found after login");
        }

        AuthProvider provider = AuthProvider.valueOf(registrationId.toUpperCase(Locale.ROOT));
        String refreshToken = authorizedClient.getRefreshToken() == null
                ? null
                : authorizedClient.getRefreshToken().getTokenValue();
        tokenRepository.save(memberId, provider, new OAuth2ProviderToken(
                authorizedClient.getAccessToken().getTokenValue(),
                refreshToken,
                authorizedClient.getAccessToken().getExpiresAt()));
    }
}
