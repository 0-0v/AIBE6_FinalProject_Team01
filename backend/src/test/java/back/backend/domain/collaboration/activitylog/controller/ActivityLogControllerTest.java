package back.backend.domain.collaboration.activitylog.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import back.backend.domain.collaboration.activitylog.dto.ActivityLogResponse;
import back.backend.domain.collaboration.activitylog.exception.ActivityLogErrorCode;
import back.backend.domain.collaboration.activitylog.service.ActivityLogService;
import back.backend.global.exception.BusinessException;
import back.backend.global.exception.CommonErrorCode;
import back.backend.global.response.PageResponse;
import back.backend.global.security.SecurityConfig;
import back.backend.global.security.SecurityContextAccessor;
import back.backend.global.security.jwt.JwtAuthenticationFilter;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.data.domain.Pageable;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(
        controllers = ActivityLogController.class,
        excludeFilters = @ComponentScan.Filter(
                type = FilterType.ASSIGNABLE_TYPE,
                classes = {SecurityConfig.class, JwtAuthenticationFilter.class}))
@AutoConfigureMockMvc(addFilters = false)
class ActivityLogControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ActivityLogService activityLogService;

    @MockitoBean
    private SecurityContextAccessor securityContextAccessor;

    @Test
    @DisplayName("t1 여행 멤버가 활동 로그를 조회하면 페이지 응답을 반환한다")
    void t1_getActivityLogsReturnsPageWhenMemberHasAccess() throws Exception {
        when(securityContextAccessor.getCurrentMemberId()).thenReturn(2L);
        when(activityLogService.getActivityLogs(any(Long.class), any(Long.class), any(Pageable.class)))
                .thenReturn(activityLogPage());

        mockMvc.perform(get("/api/trips/{tripId}/activity-logs", 1L)
                        .param("page", "0")
                        .param("size", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content[0].id").value(10))
                .andExpect(jsonPath("$.data.content[0].actionType").value("PLACE_ADDED"))
                .andExpect(jsonPath("$.data.content[0].metadata.placeName").value("자매국수"))
                .andExpect(jsonPath("$.data.totalElements").value(1));
    }

    @Test
    @DisplayName("t2 미인증 사용자가 활동 로그를 조회하면 401 응답을 반환한다")
    void t2_getActivityLogsReturnsUnauthorizedWhenNotAuthenticated() throws Exception {
        when(securityContextAccessor.getCurrentMemberId())
                .thenThrow(new BusinessException(CommonErrorCode.UNAUTHORIZED));

        mockMvc.perform(get("/api/trips/{tripId}/activity-logs", 1L))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("COMMON_401"));
    }

    @Test
    @DisplayName("t3 여행 멤버가 아닌 회원이 활동 로그를 조회하면 403 응답을 반환한다")
    void t3_getActivityLogsReturnsForbiddenWhenMemberHasNoAccess() throws Exception {
        when(securityContextAccessor.getCurrentMemberId()).thenReturn(3L);
        when(activityLogService.getActivityLogs(any(Long.class), any(Long.class), any(Pageable.class)))
                .thenThrow(new BusinessException(ActivityLogErrorCode.TRIP_ACCESS_DENIED));

        mockMvc.perform(get("/api/trips/{tripId}/activity-logs", 1L))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ACTIVITY_LOG_403_1"));
    }

    private PageResponse<ActivityLogResponse> activityLogPage() {
        ActivityLogResponse activityLog = new ActivityLogResponse(
                10L,
                1L,
                2L,
                null,
                "PLACE_ADDED",
                "TRIP_PLACE",
                20L,
                "후보 장소가 추가되었습니다.",
                Map.of("placeName", "자매국수"),
                LocalDateTime.of(2026, 7, 22, 16, 0)
        );
        return new PageResponse<>(List.of(activityLog), 0, 20, 1, 1, true, true, false);
    }
}
