package back.backend.global.security.oauth2;

import back.backend.domain.auth.service.OAuthLoginCodeService;
import back.backend.domain.member.entity.Member;
import back.backend.domain.member.repository.MemberRepository;
import back.backend.global.exception.BusinessException;
import back.backend.global.exception.CommonErrorCode;
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
    private final OAuthLoginCodeService oAuthLoginCodeService;
    private final MemberRepository memberRepository;

    public OAuth2LoginSuccessHandler(
            JwtProvider jwtProvider,
            RefreshTokenRepository refreshTokenRepository,
            RefreshTokenCookieProvider refreshTokenCookieProvider,
            FrontendProperties frontendProperties,
            OAuth2TokenCaptureService oAuth2TokenCaptureService,
            OAuthLoginCodeService oAuthLoginCodeService,
            MemberRepository memberRepository
    ) {
        this.jwtProvider = jwtProvider;
        this.refreshTokenRepository = refreshTokenRepository;
        this.refreshTokenCookieProvider = refreshTokenCookieProvider;
        this.frontendProperties = frontendProperties;
        this.oAuth2TokenCaptureService = oAuth2TokenCaptureService;
        this.oAuthLoginCodeService = oAuthLoginCodeService;
        this.memberRepository = memberRepository;
    }

    @Override
    public void onAuthenticationSuccess(
            HttpServletRequest request,
            HttpServletResponse response,
            Authentication authentication
    ) throws IOException {
        MemberPrincipal principal = (MemberPrincipal) authentication.getPrincipal();
        Member member = memberRepository.findById(principal.getMemberId())
                .orElseThrow(() -> new BusinessException(
                        CommonErrorCode.UNAUTHORIZED, "인증된 회원을 찾을 수 없습니다."));
        oAuth2TokenCaptureService.capture(authentication, principal.getMemberId());
        String accessToken = jwtProvider.createAccessToken(
                principal.getMemberId(), principal.getUsername(), member.getTokenVersion());
        String refreshToken = jwtProvider.createRefreshToken(
                principal.getMemberId(), member.getTokenVersion());
        refreshTokenRepository.save(principal.getMemberId(), refreshToken);
        response.addHeader(HttpHeaders.SET_COOKIE, refreshTokenCookieProvider.create(refreshToken).toString());

        String code = oAuthLoginCodeService.issue(accessToken);
        String redirectUrl = UriComponentsBuilder.fromUriString(frontendProperties.getFrontendBaseUrl())
                .path(CALLBACK_PATH)
                .queryParam("code", code)
                .build()
                .toUriString();

        response.sendRedirect(redirectUrl);
    }
}
