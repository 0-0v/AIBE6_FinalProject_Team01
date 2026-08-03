package back.backend.global.security.oauth2;

import back.backend.domain.member.entity.AuthProvider;
import back.backend.domain.member.entity.Member;
import back.backend.domain.member.exception.MemberErrorCode;
import back.backend.domain.member.port.SocialAccountConnector;
import back.backend.global.exception.BusinessException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Component
public class SocialOAuthAccountConnector implements SocialAccountConnector {

    private static final Logger log = LoggerFactory.getLogger(SocialOAuthAccountConnector.class);
    private static final String KAKAO_UNLINK_URL = "https://kapi.kakao.com/v1/user/unlink";

    private final RestClient restClient;
    private final OAuth2TokenRepository tokenRepository;
    private final OAuth2TokenProperties properties;

    @Autowired
    public SocialOAuthAccountConnector(
            OAuth2TokenRepository tokenRepository,
            OAuth2TokenProperties properties
    ) {
        this(RestClient.builder(), tokenRepository, properties);
    }

    SocialOAuthAccountConnector(
            RestClient.Builder restClientBuilder,
            OAuth2TokenRepository tokenRepository,
            OAuth2TokenProperties properties
    ) {
        this.restClient = restClientBuilder.build();
        this.tokenRepository = tokenRepository;
        this.properties = properties;
    }

    @Override
    public void unlink(Member member) {
        try {
            switch (member.getProvider()) {
                case LOCAL -> {
                    return;
                }
                case GOOGLE -> unlinkGoogle(member);
                case KAKAO -> unlinkKakao(member);
                default -> throw unlinkFailed();
            }
            tokenRepository.delete(member.getId(), member.getProvider());
        } catch (BusinessException exception) {
            throw exception;
        } catch (RestClientException | IllegalStateException exception) {
            log.warn("Social account unlink failed for memberId={} provider={} ({})",
                    member.getId(), member.getProvider(), exception.getClass().getSimpleName());
            throw unlinkFailed();
        }
    }

    private void unlinkGoogle(Member member) {
        OAuth2ProviderToken token = requiredToken(member);
        String revocationToken = hasText(token.refreshToken())
                ? token.refreshToken()
                : token.accessToken();
        if (!hasText(revocationToken)) {
            throw unlinkFailed();
        }
        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("token", revocationToken);
        restClient.post()
                .uri("https://oauth2.googleapis.com/revoke")
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(body)
                .retrieve()
                .toBodilessEntity();
    }

    private void unlinkKakao(Member member) {
        String adminKey = properties.getKakaoAdminKey();
        if (hasText(adminKey)) {
            MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
            body.add("target_id_type", "user_id");
            body.add("target_id", member.getProviderId());
            restClient.post()
                    .uri(KAKAO_UNLINK_URL)
                    .header(HttpHeaders.AUTHORIZATION, "KakaoAK " + adminKey)
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(body)
                    .retrieve()
                    .toBodilessEntity();
            return;
        }

        OAuth2ProviderToken token = requiredToken(member);
        if (!hasText(token.accessToken())) {
            throw unlinkFailed();
        }
        restClient.post()
                .uri(KAKAO_UNLINK_URL)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token.accessToken())
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .retrieve()
                .toBodilessEntity();
    }

    private OAuth2ProviderToken requiredToken(Member member) {
        return tokenRepository.find(member.getId(), member.getProvider())
                .orElseThrow(this::unlinkFailed);
    }

    private BusinessException unlinkFailed() {
        return new BusinessException(MemberErrorCode.SOCIAL_UNLINK_FAILED);
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
