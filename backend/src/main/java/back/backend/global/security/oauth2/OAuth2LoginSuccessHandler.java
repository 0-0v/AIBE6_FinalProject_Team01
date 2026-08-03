package back.backend.global.security.oauth2;

import back.backend.global.config.FrontendProperties;
import back.backend.global.security.MemberPrincipal;
import back.backend.global.security.jwt.JwtProvider;
import back.backend.global.security.jwt.RefreshTokenCookieProvider;
import back.backend.global.security.jwt.RefreshTokenRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.http.HttpHeaders;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

@Component
public class OAuth2LoginSuccessHandler implements AuthenticationSuccessHandler {

    private static final String CALLBACK_PATH = "/oauth/callback";

    private final JwtProvider jwtProvider;
    private final RefreshTokenRepository refreshTokenRepository;
    private final RefreshTokenCookieProvider refreshTokenCookieProvider;
    private final FrontendProperties frontendProperties;
    private final OAuth2TokenCaptureService oAuth2TokenCaptureService;

    public OAuth2LoginSuccessHandler(
            JwtProvider jwtProvider,
            RefreshTokenRepository refreshTokenRepository,
            RefreshTokenCookieProvider refreshTokenCookieProvider,
            FrontendProperties frontendProperties,
            OAuth2TokenCaptureService oAuth2TokenCaptureService
    ) {
        this.jwtProvider = jwtProvider;
        this.refreshTokenRepository = refreshTokenRepository;
        this.refreshTokenCookieProvider = refreshTokenCookieProvider;
        this.frontendProperties = frontendProperties;
        this.oAuth2TokenCaptureService = oAuth2TokenCaptureService;
    }

    @Override
    public void onAuthenticationSuccess(
            HttpServletRequest request,
            HttpServletResponse response,
            Authentication authentication
    ) throws IOException {
        MemberPrincipal principal = (MemberPrincipal) authentication.getPrincipal();
        oAuth2TokenCaptureService.capture(authentication, principal.getMemberId());
        String accessToken = jwtProvider.createAccessToken(principal.getMemberId(), principal.getUsername());
        String refreshToken = jwtProvider.createRefreshToken(principal.getMemberId());
        refreshTokenRepository.save(principal.getMemberId(), refreshToken);
        response.addHeader(HttpHeaders.SET_COOKIE, refreshTokenCookieProvider.create(refreshToken).toString());

        String redirectUrl = UriComponentsBuilder.fromUriString(frontendProperties.getFrontendBaseUrl())
                .path(CALLBACK_PATH)
                .queryParam("accessToken", accessToken)
                .build()
                .toUriString();

        response.sendRedirect(redirectUrl);
    }
}
