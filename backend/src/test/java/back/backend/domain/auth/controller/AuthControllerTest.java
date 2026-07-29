package back.backend.domain.auth.controller;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import back.backend.domain.auth.dto.TokenResponse;
import back.backend.domain.auth.service.AuthService;
import back.backend.domain.auth.service.EmailVerificationService;
import back.backend.global.exception.BusinessException;
import back.backend.global.exception.CommonErrorCode;
import back.backend.global.security.SecurityConfig;
import back.backend.global.security.SecurityContextAccessor;
import back.backend.global.security.jwt.JwtAuthenticationFilter;
import back.backend.global.security.jwt.RefreshTokenCookieProvider;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.http.ResponseCookie;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(
        controllers = AuthController.class,
        excludeFilters = @ComponentScan.Filter(
                type = FilterType.ASSIGNABLE_TYPE,
                classes = {SecurityConfig.class, JwtAuthenticationFilter.class}))
@AutoConfigureMockMvc(addFilters = false)
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AuthService authService;

    @MockitoBean
    private SecurityContextAccessor securityContextAccessor;

    @MockitoBean
    private RefreshTokenCookieProvider refreshTokenCookieProvider;

    @MockitoBean
    private EmailVerificationService emailVerificationService;

    @Test
    @DisplayName("t1 유효한 리프레시 토큰 쿠키로 재발급을 요청하면 200과 새 액세스 토큰, 새 리프레시 토큰 쿠키를 반환한다")
    void t1_reissueReturnsNewAccessTokenAndSetsRefreshTokenCookie() throws Exception {
        when(authService.reissue("refresh-token-value"))
                .thenReturn(new TokenResponse("new-access-token", "new-refresh-token"));
        ResponseCookie cookie = ResponseCookie.from("refreshToken", "new-refresh-token").build();
        when(refreshTokenCookieProvider.create("new-refresh-token")).thenReturn(cookie);

        mockMvc.perform(post("/api/auth/reissue")
                        .cookie(new Cookie("refreshToken", "refresh-token-value")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.accessToken").value("new-access-token"))
                .andExpect(jsonPath("$.data.refreshToken").doesNotExist())
                .andExpect(header().string("Set-Cookie", containsString("refreshToken=new-refresh-token")));
    }

    @Test
    @DisplayName("t2 리프레시 토큰 쿠키가 없으면 비로그인 상태로 판단하고 204를 반환한다")
    void t2_reissueReturnsNoContentWhenRefreshTokenCookieIsMissing() throws Exception {
        mockMvc.perform(post("/api/auth/reissue"))
                .andExpect(status().isNoContent());

        verifyNoInteractions(authService);
    }

    @Test
    @DisplayName("t3 유효하지 않은 리프레시 토큰이면 401을 반환한다")
    void t3_reissueReturnsUnauthorizedWhenRefreshTokenIsInvalid() throws Exception {
        when(authService.reissue("invalid-token"))
                .thenThrow(new BusinessException(CommonErrorCode.UNAUTHORIZED, "유효하지 않은 리프레시 토큰입니다."));

        mockMvc.perform(post("/api/auth/reissue")
                        .cookie(new Cookie("refreshToken", "invalid-token")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("COMMON_401"));
    }

    @Test
    @DisplayName("t4 인증된 사용자가 로그아웃하면 200을 반환하고 리프레시 토큰을 삭제하며 쿠키를 만료시킨다")
    void t4_logoutReturnsOkDeletesRefreshTokenAndExpiresCookie() throws Exception {
        when(securityContextAccessor.getCurrentMemberId()).thenReturn(1L);
        ResponseCookie expiredCookie = ResponseCookie.from("refreshToken", "").maxAge(0).build();
        when(refreshTokenCookieProvider.expire()).thenReturn(expiredCookie);

        mockMvc.perform(post("/api/auth/logout"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(header().string("Set-Cookie", containsString("Max-Age=0")));

        verify(authService).logout(1L);
    }

    @Test
    @DisplayName("t5 인증되지 않은 사용자가 로그아웃하면 401을 반환한다")
    void t5_logoutReturnsUnauthorizedWhenNotAuthenticated() throws Exception {
        when(securityContextAccessor.getCurrentMemberId())
                .thenThrow(new BusinessException(CommonErrorCode.UNAUTHORIZED));

        mockMvc.perform(post("/api/auth/logout"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("COMMON_401"));
    }

    @Test
    @DisplayName("t6 사용 가능한 닉네임으로 중복 확인하면 200과 true를 반환한다")
    void t6_nicknameAvailabilityReturnsTrueForAvailableNickname() throws Exception {
        when(authService.isNicknameAvailable("여행자")).thenReturn(true);

        mockMvc.perform(post("/api/auth/nickname-availability")
                        .contentType("application/json")
                        .content("{\"nickname\":\"여행자\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.available").value(true));
    }

    @Test
    @DisplayName("t7 형식에 맞지 않는 닉네임으로 중복 확인하면 400을 반환한다")
    void t7_nicknameAvailabilityRejectsInvalidNickname() throws Exception {
        mockMvc.perform(post("/api/auth/nickname-availability")
                        .contentType("application/json")
                        .content("{\"nickname\":\"a\"}"))
                .andExpect(status().isBadRequest());
    }
}
