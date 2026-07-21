package back.backend.domain.member.controller;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

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
}
