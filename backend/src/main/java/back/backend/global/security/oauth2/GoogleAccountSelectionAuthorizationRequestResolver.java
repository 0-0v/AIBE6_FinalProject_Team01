package back.backend.global.security.oauth2;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.web.DefaultOAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;
import org.springframework.security.oauth2.core.endpoint.OAuth2ParameterNames;

public class GoogleAccountSelectionAuthorizationRequestResolver
        implements OAuth2AuthorizationRequestResolver {

    private static final String GOOGLE = "google";
    private static final String PROMPT = "prompt";
    private static final String CONSENT_AND_SELECT_ACCOUNT = "consent select_account";
    private static final String ACCESS_TYPE = "access_type";
    private static final String OFFLINE = "offline";

    private final OAuth2AuthorizationRequestResolver delegate;

    public GoogleAccountSelectionAuthorizationRequestResolver(
            ClientRegistrationRepository clientRegistrationRepository
    ) {
        this.delegate = new DefaultOAuth2AuthorizationRequestResolver(clientRegistrationRepository);
    }

    @Override
    public OAuth2AuthorizationRequest resolve(HttpServletRequest request) {
        OAuth2AuthorizationRequest authorizationRequest = delegate.resolve(request);
        if (authorizationRequest == null) {
            return null;
        }
        Object registrationId = authorizationRequest.getAttributes()
                .get(OAuth2ParameterNames.REGISTRATION_ID);
        return withAccountSelection(authorizationRequest, String.valueOf(registrationId));
    }

    @Override
    public OAuth2AuthorizationRequest resolve(
            HttpServletRequest request,
            String clientRegistrationId
    ) {
        return withAccountSelection(delegate.resolve(request, clientRegistrationId), clientRegistrationId);
    }

    static OAuth2AuthorizationRequest withAccountSelection(
            OAuth2AuthorizationRequest authorizationRequest,
            String registrationId
    ) {
        if (authorizationRequest == null || !GOOGLE.equals(registrationId)) {
            return authorizationRequest;
        }
        return OAuth2AuthorizationRequest.from(authorizationRequest)
                .additionalParameters(parameters -> {
                    parameters.put(PROMPT, CONSENT_AND_SELECT_ACCOUNT);
                    parameters.put(ACCESS_TYPE, OFFLINE);
                })
                .build();
    }
}
