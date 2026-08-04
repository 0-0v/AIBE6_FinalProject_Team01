package back.backend.domain.member.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import back.backend.domain.member.dto.MemberResponse;
import back.backend.domain.member.entity.AuthProvider;
import back.backend.domain.member.service.MemberService;
import back.backend.global.exception.BusinessException;
import back.backend.global.exception.CommonErrorCode;
import back.backend.global.security.SecurityConfig;
import back.backend.global.security.SecurityContextAccessor;
import back.backend.global.security.jwt.JwtAuthenticationFilter;
import back.backend.global.security.jwt.RefreshTokenCookieProvider;
import org.springframework.http.ResponseCookie;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.multipart.MultipartFile;

@WebMvcTest(
        controllers = MemberController.class,
        excludeFilters = @ComponentScan.Filter(
                type = FilterType.ASSIGNABLE_TYPE,
                classes = {SecurityConfig.class, JwtAuthenticationFilter.class}))
@AutoConfigureMockMvc(addFilters = false)
class MemberControllerTest {

    @Autowired
    private MockMvc mockMvc;


    @MockitoBean
    private MemberService memberService;

    @MockitoBean
    private SecurityContextAccessor securityContextAccessor;

    @MockitoBean
    private RefreshTokenCookieProvider refreshTokenCookieProvider;

    @Test
    @DisplayName("t1 인증된 사용자가 내 정보를 조회하면 200과 회원 정보를 반환한다")
    void t1_getMeReturnsMemberResponseWhenAuthenticated() throws Exception {
        when(securityContextAccessor.getCurrentMemberId()).thenReturn(1L);
        when(memberService.getMember(1L)).thenReturn(
                new MemberResponse(1L, "user@example.com", "닉네임", "https://example.com/image.png", AuthProvider.KAKAO));

        mockMvc.perform(get("/api/members/me"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(1))
                .andExpect(jsonPath("$.data.email").value("user@example.com"))
                .andExpect(jsonPath("$.data.nickname").value("닉네임"))
                .andExpect(jsonPath("$.data.provider").value("KAKAO"));
    }

    @Test
    @DisplayName("t2 인증되지 않은 사용자가 내 정보를 조회하면 401을 반환한다")
    void t2_getMeReturnsUnauthorizedWhenNotAuthenticated() throws Exception {
        when(securityContextAccessor.getCurrentMemberId())
                .thenThrow(new BusinessException(CommonErrorCode.UNAUTHORIZED));

        mockMvc.perform(get("/api/members/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("COMMON_401"));
    }

    @Test
    @DisplayName("t3 유효한 닉네임으로 변경 요청하면 200과 변경된 회원 정보를 반환한다")
    void t3_updateNicknameReturnsUpdatedMemberResponse() throws Exception {
        when(securityContextAccessor.getCurrentMemberId()).thenReturn(1L);
        when(memberService.updateNickname(1L, "새닉네임")).thenReturn(
                new MemberResponse(1L, "user@example.com", "새닉네임", null, AuthProvider.KAKAO));

        mockMvc.perform(patch("/api/members/me/nickname")
                        .contentType("application/json")
                        .content("{\"nickname\":\"새닉네임\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.nickname").value("새닉네임"));
    }

    @Test
    @DisplayName("t4 형식에 맞지 않는 닉네임으로 변경 요청하면 400을 반환한다")
    void t4_updateNicknameReturnsBadRequestWhenNicknameInvalid() throws Exception {
        mockMvc.perform(patch("/api/members/me/nickname")
                        .contentType("application/json")
                        .content("{\"nickname\":\"a\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("COMMON_400"));
    }

    @Test
    @DisplayName("t5 프로필 이미지를 업로드하면 200과 갱신된 이미지 URL을 반환한다")
    void t5_updateProfileImageReturnsUpdatedMemberResponse() throws Exception {
        MockMultipartFile file =
                new MockMultipartFile("file", "profile.png", "image/png", "image-content".getBytes());
        when(securityContextAccessor.getCurrentMemberId()).thenReturn(1L);
        when(memberService.updateProfileImage(eq(1L), any(MultipartFile.class))).thenReturn(
                new MemberResponse(1L, "user@example.com", "닉네임", "/uploads/profile-images/1-uuid.png",
                        AuthProvider.KAKAO));

        mockMvc.perform(multipart("/api/members/me/profile-image").file(file))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.profileImageUrl").value("/uploads/profile-images/1-uuid.png"));
    }

    @Test
    @DisplayName("t6 인증된 사용자가 탈퇴하면 회원 상태를 변경하고 리프레시 토큰 쿠키를 만료한다")
    void t6_withdrawMemberExpiresRefreshTokenCookie() throws Exception {
        when(securityContextAccessor.getCurrentMemberId()).thenReturn(1L);
        when(refreshTokenCookieProvider.expire()).thenReturn(
                ResponseCookie.from("refreshToken", "").path("/api/auth").maxAge(0).build());

        mockMvc.perform(delete("/api/members/me"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("회원 탈퇴가 완료되었습니다."))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.header()
                        .string("Set-Cookie", org.hamcrest.Matchers.containsString("Max-Age=0")));

        org.mockito.Mockito.verify(memberService).withdraw(1L);
    }

    @Test
    @DisplayName("t7 닉네임 중복 확인 요청 시 현재 회원을 제외한 사용 가능 여부를 반환한다")
    void t7_checkNicknameAvailabilityReturnsAvailability() throws Exception {
        when(securityContextAccessor.getCurrentMemberId()).thenReturn(1L);
        when(memberService.isNicknameAvailable(1L, "새닉네임")).thenReturn(true);

        mockMvc.perform(post("/api/members/me/nickname-availability")
                        .contentType("application/json")
                        .content("{\"nickname\":\"새닉네임\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.available").value(true));
    }

    @Test
    @DisplayName("t8 형식에 맞지 않는 닉네임의 중복 확인 요청은 400을 반환한다")
    void t8_checkNicknameAvailabilityRejectsInvalidNickname() throws Exception {
        mockMvc.perform(post("/api/members/me/nickname-availability")
                        .contentType("application/json")
                        .content("{\"nickname\":\"a\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("COMMON_400"));
    }
}
