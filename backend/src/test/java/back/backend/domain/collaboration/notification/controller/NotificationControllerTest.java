package back.backend.domain.collaboration.notification.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import back.backend.domain.collaboration.notification.dto.NotificationResponse;
import back.backend.domain.collaboration.notification.dto.ReadNotificationCountResponse;
import back.backend.domain.collaboration.notification.dto.UnreadNotificationCountResponse;
import back.backend.domain.collaboration.notification.entity.NotificationType;
import back.backend.domain.collaboration.notification.service.NotificationService;
import back.backend.global.exception.BusinessException;
import back.backend.global.exception.CommonErrorCode;
import back.backend.global.response.PageResponse;
import back.backend.global.security.SecurityConfig;
import back.backend.global.security.SecurityContextAccessor;
import back.backend.global.security.jwt.JwtAuthenticationFilter;
import java.time.LocalDateTime;
import java.util.List;
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
        controllers = NotificationController.class,
        excludeFilters = @ComponentScan.Filter(
                type = FilterType.ASSIGNABLE_TYPE,
                classes = {SecurityConfig.class, JwtAuthenticationFilter.class}))
@AutoConfigureMockMvc(addFilters = false)
class NotificationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private NotificationService notificationService;

    @MockitoBean
    private SecurityContextAccessor securityContextAccessor;

    @Test
    @DisplayName("t1 인증 회원이 알림 목록을 조회하면 페이지 응답을 반환한다")
    void t1_getNotificationsReturnsPagedResponseWhenAuthenticated() throws Exception {
        when(securityContextAccessor.getCurrentMemberId()).thenReturn(1L);
        when(notificationService.getNotifications(any(Long.class), any(Pageable.class)))
                .thenReturn(notificationPage());

        mockMvc.perform(get("/api/notifications").param("page", "0").param("size", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content[0].id").value(10))
                .andExpect(jsonPath("$.data.content[0].notificationType").value("VOTE"))
                .andExpect(jsonPath("$.data.totalElements").value(1));
    }

    @Test
    @DisplayName("t2 인증 회원이 읽지 않은 알림 개수를 조회한다")
    void t2_getUnreadCountReturnsUnreadCountWhenAuthenticated() throws Exception {
        when(securityContextAccessor.getCurrentMemberId()).thenReturn(1L);
        when(notificationService.getUnreadCount(1L)).thenReturn(new UnreadNotificationCountResponse(3L));

        mockMvc.perform(get("/api/notifications/unread-count"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.count").value(3));
    }

    @Test
    @DisplayName("t3 인증 회원이 본인의 알림을 읽음 처리하면 성공 응답을 반환한다")
    void t3_markAsReadReturnsSuccessWhenNotificationIsOwned() throws Exception {
        when(securityContextAccessor.getCurrentMemberId()).thenReturn(1L);

        mockMvc.perform(patch("/api/notifications/{notificationId}/read", 10L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").doesNotExist());

        verify(notificationService).markAsRead(1L, 10L);
    }

    @Test
    @DisplayName("t4 인증 회원이 모든 알림을 읽음 처리하면 변경 개수를 반환한다")
    void t4_markAllAsReadReturnsUpdatedCountWhenAuthenticated() throws Exception {
        when(securityContextAccessor.getCurrentMemberId()).thenReturn(1L);
        when(notificationService.markAllAsRead(1L)).thenReturn(new ReadNotificationCountResponse(2));

        mockMvc.perform(patch("/api/notifications/read-all"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.count").value(2));
    }

    @Test
    @DisplayName("t5 미인증 사용자가 알림 목록을 조회하면 401 응답을 반환한다")
    void t5_getNotificationsReturnsUnauthorizedWhenNotAuthenticated() throws Exception {
        when(securityContextAccessor.getCurrentMemberId())
                .thenThrow(new BusinessException(CommonErrorCode.UNAUTHORIZED));

        mockMvc.perform(get("/api/notifications"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("COMMON_401"));
    }

    private PageResponse<NotificationResponse> notificationPage() {
        NotificationResponse notification = new NotificationResponse(
                10L,
                1L,
                NotificationType.VOTE,
                "장소 투표 알림",
                "새로운 장소 투표가 시작되었습니다.",
                "TRIP_PLACE",
                20L,
                false,
                null,
                LocalDateTime.of(2026, 7, 22, 12, 0)
        );
        return new PageResponse<>(List.of(notification), 0, 20, 1, 1, true, true, false);
    }
}
