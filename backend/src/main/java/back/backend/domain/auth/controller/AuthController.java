package back.backend.domain.auth.controller;

import back.backend.domain.auth.dto.AccessTokenResponse;
import back.backend.domain.auth.dto.EmailCodeVerificationRequest;
import back.backend.domain.auth.dto.EmailRequest;
import back.backend.domain.auth.dto.LoginRequest;
import back.backend.domain.auth.dto.PasswordResetRequest;
import back.backend.domain.auth.dto.SignupRequest;
import back.backend.domain.auth.dto.TokenResponse;
import back.backend.domain.auth.service.AuthService;
import back.backend.domain.auth.service.EmailVerificationService;
import back.backend.global.response.ApiResponse;
import back.backend.global.security.SecurityContextAccessor;
import back.backend.global.security.jwt.RefreshTokenCookieProvider;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.RequestBody;
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
    private final EmailVerificationService emailVerificationService;

    public AuthController(
            AuthService authService,
            SecurityContextAccessor securityContextAccessor,
            RefreshTokenCookieProvider refreshTokenCookieProvider,
            EmailVerificationService emailVerificationService
    ) {
        this.authService = authService;
        this.securityContextAccessor = securityContextAccessor;
        this.refreshTokenCookieProvider = refreshTokenCookieProvider;
        this.emailVerificationService = emailVerificationService;
    }

    @PostMapping("/email-verifications")
    public ApiResponse<Void> sendVerificationCode(@Valid @RequestBody EmailRequest request) {
        emailVerificationService.sendCode(request.email(), request.purpose());
        return ApiResponse.successMessage("인증번호 발송 요청을 처리했습니다.");
    }

    @PostMapping("/email-verifications/confirm")
    public ApiResponse<Void> verifyEmailCode(@Valid @RequestBody EmailCodeVerificationRequest request) {
        emailVerificationService.verifyCode(request.email(), request.code(), request.purpose());
        return ApiResponse.successMessage("이메일 인증이 완료되었습니다.");
    }

    @PostMapping("/signup")
    public ApiResponse<AccessTokenResponse> signup(
            @Valid @RequestBody SignupRequest request,
            HttpServletResponse response
    ) {
        return respondWithTokens(authService.signup(request), response);
    }

    @PostMapping("/login")
    public ApiResponse<AccessTokenResponse> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletResponse response
    ) {
        return respondWithTokens(authService.login(request), response);
    }

    @PostMapping("/password-reset")
    public ApiResponse<Void> resetPassword(@Valid @RequestBody PasswordResetRequest request) {
        authService.resetPassword(request);
        return ApiResponse.successMessage("비밀번호가 변경되었습니다.");
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

    private ApiResponse<AccessTokenResponse> respondWithTokens(
            TokenResponse tokens,
            HttpServletResponse response
    ) {
        response.addHeader(HttpHeaders.SET_COOKIE, refreshTokenCookieProvider.create(tokens.refreshToken()).toString());
        return ApiResponse.success(AccessTokenResponse.from(tokens));
    }
}
