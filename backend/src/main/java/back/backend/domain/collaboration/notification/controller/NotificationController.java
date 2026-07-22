package back.backend.domain.collaboration.notification.controller;

import back.backend.domain.collaboration.notification.dto.NotificationResponse;
import back.backend.domain.collaboration.notification.dto.ReadNotificationCountResponse;
import back.backend.domain.collaboration.notification.dto.UnreadNotificationCountResponse;
import back.backend.domain.collaboration.notification.service.NotificationService;
import back.backend.global.response.ApiResponse;
import back.backend.global.response.PageResponse;
import back.backend.global.security.SecurityContextAccessor;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Notification", description = "알림 조회 및 읽음 처리 API")
@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;
    private final SecurityContextAccessor securityContextAccessor;

    public NotificationController(
            NotificationService notificationService,
            SecurityContextAccessor securityContextAccessor
    ) {
        this.notificationService = notificationService;
        this.securityContextAccessor = securityContextAccessor;
    }

    @Operation(summary = "내 알림 목록 조회", description = "인증 회원의 알림을 최신순으로 페이지 조회합니다.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "조회 성공"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "인증 필요")
    })
    @GetMapping
    public ApiResponse<PageResponse<NotificationResponse>> getNotifications(
            @ParameterObject @PageableDefault(size = 20) Pageable pageable
    ) {
        Long memberId = securityContextAccessor.getCurrentMemberId();
        return ApiResponse.success(notificationService.getNotifications(memberId, pageable));
    }

    @Operation(summary = "읽지 않은 알림 개수 조회")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "조회 성공"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "인증 필요")
    })
    @GetMapping("/unread-count")
    public ApiResponse<UnreadNotificationCountResponse> getUnreadCount() {
        Long memberId = securityContextAccessor.getCurrentMemberId();
        return ApiResponse.success(notificationService.getUnreadCount(memberId));
    }

    @Operation(summary = "단일 알림 읽음 처리")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "처리 성공"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "인증 필요"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "본인 소유 알림 없음")
    })
    @PatchMapping("/{notificationId}/read")
    public ApiResponse<Void> markAsRead(
            @Parameter(description = "알림 식별자", required = true)
            @PathVariable Long notificationId
    ) {
        Long memberId = securityContextAccessor.getCurrentMemberId();
        notificationService.markAsRead(memberId, notificationId);
        return ApiResponse.successMessage("알림을 읽음 처리했습니다.");
    }

    @Operation(summary = "모든 알림 읽음 처리")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "처리 성공"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "인증 필요")
    })
    @PatchMapping("/read-all")
    public ApiResponse<ReadNotificationCountResponse> markAllAsRead() {
        Long memberId = securityContextAccessor.getCurrentMemberId();
        return ApiResponse.success(notificationService.markAllAsRead(memberId));
    }
}
