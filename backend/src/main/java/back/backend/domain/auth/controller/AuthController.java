package back.backend.domain.auth.controller;

import back.backend.domain.auth.dto.AccessTokenResponse;
import back.backend.domain.auth.dto.TokenResponse;
import back.backend.domain.auth.service.AuthService;
import back.backend.global.response.ApiResponse;
import back.backend.global.security.SecurityContextAccessor;
import back.backend.global.security.jwt.RefreshTokenCookieProvider;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final String REFRESH_TOKEN_COOKIE = "refreshToken";

    private final AuthService authService;
    private final SecurityContextAccessor securityContextAccessor;
    private final RefreshTokenCookieProvider refreshTokenCookieProvider;

    public AuthController(
            AuthService authService,
            SecurityContextAccessor securityContextAccessor,
            RefreshTokenCookieProvider refreshTokenCookieProvider
    ) {
        this.authService = authService;
        this.securityContextAccessor = securityContextAccessor;
        this.refreshTokenCookieProvider = refreshTokenCookieProvider;
    }

    @PostMapping("/reissue")
    public ApiResponse<AccessTokenResponse> reissue(
            @CookieValue(name = REFRESH_TOKEN_COOKIE, required = false) String refreshToken,
            HttpServletResponse response
    ) {
        TokenResponse tokens = authService.reissue(refreshToken);
        response.addHeader(HttpHeaders.SET_COOKIE, refreshTokenCookieProvider.create(tokens.refreshToken()).toString());
        return ApiResponse.success(AccessTokenResponse.from(tokens));
    }

    @PostMapping("/logout")
    public ApiResponse<Void> logout(HttpServletResponse response) {
        authService.logout(securityContextAccessor.getCurrentMemberId());
        response.addHeader(HttpHeaders.SET_COOKIE, refreshTokenCookieProvider.expire().toString());
        return ApiResponse.ok();
    }
}
