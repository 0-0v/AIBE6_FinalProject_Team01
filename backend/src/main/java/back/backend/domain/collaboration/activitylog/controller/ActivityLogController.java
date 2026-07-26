package back.backend.domain.collaboration.activitylog.controller;

import back.backend.domain.collaboration.activitylog.dto.ActivityLogResponse;
import back.backend.domain.collaboration.activitylog.service.ActivityLogService;
import back.backend.global.response.ApiResponse;
import back.backend.global.response.PageResponse;
import back.backend.global.security.SecurityContextAccessor;
import back.backend.domain.trip.service.GuestAccessCookieProvider;
import back.backend.domain.trip.service.GuestTripAccessService;
import back.backend.global.exception.BusinessException;
import back.backend.global.exception.CommonErrorCode;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Activity Log", description = "여행 활동 로그 조회 API")
@RestController
@RequestMapping("/api/trips/{tripId}/activity-logs")
public class ActivityLogController {

    private final ActivityLogService activityLogService;
    private final SecurityContextAccessor securityContextAccessor;
    private final GuestTripAccessService guestTripAccessService;

    public ActivityLogController(
            ActivityLogService activityLogService,
            SecurityContextAccessor securityContextAccessor,
            GuestTripAccessService guestTripAccessService
    ) {
        this.activityLogService = activityLogService;
        this.securityContextAccessor = securityContextAccessor;
        this.guestTripAccessService = guestTripAccessService;
    }

    @Operation(summary = "여행 활동 로그 조회", description = "여행 멤버가 주요 변경 기록을 최신순으로 조회합니다.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "조회 성공"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "인증 필요"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "여행 멤버 권한 없음")
    })
    @GetMapping
    public ApiResponse<PageResponse<ActivityLogResponse>> getActivityLogs(
            @Parameter(description = "여행 식별자", required = true)
            @PathVariable Long tripId,
            @ParameterObject @PageableDefault(size = 20) Pageable pageable,
            @CookieValue(name = GuestAccessCookieProvider.COOKIE_NAME, required = false) String guestToken
    ) {
        if (guestTripAccessService.canView(tripId, guestToken)) {
            return ApiResponse.success(
                    activityLogService.getActivityLogsForAuthorizedViewer(tripId, pageable));
        }
        var principal = securityContextAccessor.getCurrentPrincipal();
        if (principal.isPresent()) {
            return ApiResponse.success(activityLogService.getActivityLogs(
                    tripId, principal.get().getMemberId(), pageable));
        }
        throw new BusinessException(CommonErrorCode.UNAUTHORIZED);
    }
}
