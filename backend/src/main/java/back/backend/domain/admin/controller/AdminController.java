package back.backend.domain.admin.controller;

import back.backend.domain.admin.dto.*;
import back.backend.domain.admin.service.AdminService;
import back.backend.domain.member.entity.MemberStatus;
import back.backend.global.response.ApiResponse;
import back.backend.global.response.PageResponse;
import back.backend.global.security.SecurityContextAccessor;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@Validated
@RestController
@RequestMapping("/api/admin")
@io.swagger.v3.oas.annotations.tags.Tag(name = "관리자")
public class AdminController {
    private final AdminService adminService;
    private final SecurityContextAccessor securityContextAccessor;

    public AdminController(AdminService adminService, SecurityContextAccessor securityContextAccessor) {
        this.adminService = adminService;
        this.securityContextAccessor = securityContextAccessor;
    }

    @GetMapping("/dashboard")
    @io.swagger.v3.oas.annotations.Operation(summary = "관리자 운영 지표 조회")
    public ApiResponse<AdminDashboardResponse> dashboard() {
        return ApiResponse.success(adminService.dashboard());
    }

    @GetMapping("/members")
    @io.swagger.v3.oas.annotations.Operation(summary = "관리자 회원 목록 조회")
    public ApiResponse<PageResponse<AdminMemberSummaryResponse>> members(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) MemberStatus status,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return ApiResponse.success(adminService.members(query, status, page, size));
    }

    @GetMapping("/members/{memberId}")
    @io.swagger.v3.oas.annotations.Operation(summary = "관리자 회원 정보 조회")
    public ApiResponse<AdminMemberSummaryResponse> member(@PathVariable Long memberId) {
        return ApiResponse.success(adminService.member(memberId));
    }

    @GetMapping("/members/{memberId}/trips")
    @io.swagger.v3.oas.annotations.Operation(summary = "관리자 회원 여행방 요약 조회")
    public ApiResponse<PageResponse<AdminTripSummaryResponse>> memberTrips(
            @PathVariable Long memberId, @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return ApiResponse.success(adminService.memberTrips(memberId, page, size));
    }

    @GetMapping("/members/{memberId}/api-usages")
    @io.swagger.v3.oas.annotations.Operation(summary = "관리자 회원 외부 API 사용 이력 조회")
    public ApiResponse<PageResponse<ExternalApiUsageResponse>> memberApiUsages(
            @PathVariable Long memberId, @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return ApiResponse.success(adminService.memberApiUsages(memberId, page, size));
    }

    @PatchMapping("/members/{memberId}/suspension")
    @io.swagger.v3.oas.annotations.Operation(summary = "관리자 회원 이용 정지")
    public ApiResponse<AdminMemberSummaryResponse> suspend(
            @PathVariable Long memberId, @Valid @RequestBody AdminMemberStatusRequest request) {
        return ApiResponse.success(adminService.suspend(
                securityContextAccessor.getCurrentMemberId(), memberId, request));
    }

    @PatchMapping("/members/{memberId}/suspension/release")
    @io.swagger.v3.oas.annotations.Operation(summary = "관리자 회원 이용 정지 해제")
    public ApiResponse<AdminMemberSummaryResponse> release(
            @PathVariable Long memberId, @Valid @RequestBody AdminMemberStatusRequest request) {
        return ApiResponse.success(adminService.releaseSuspension(
                securityContextAccessor.getCurrentMemberId(), memberId, request.reason()));
    }

    @GetMapping("/action-logs")
    @io.swagger.v3.oas.annotations.Operation(summary = "관리자 감사 로그 조회")
    public ApiResponse<PageResponse<AdminActionLogResponse>> actionLogs(
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return ApiResponse.success(adminService.actionLogs(page, size));
    }
}
