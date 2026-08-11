package back.backend.domain.admin.controller;

import back.backend.domain.admin.dto.*;
import back.backend.domain.admin.service.AdminService;
import back.backend.domain.member.entity.MemberStatus;
import back.backend.domain.inquiry.dto.InquiryReplyRequest;
import back.backend.domain.inquiry.dto.InquiryResponse;
import back.backend.domain.inquiry.entity.InquiryStatus;
import back.backend.domain.inquiry.service.InquiryService;
import back.backend.global.response.ApiResponse;
import back.backend.global.response.PageResponse;
import back.backend.global.security.SecurityContextAccessor;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.validation.annotation.Validated;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@Validated
@RestController
@RequestMapping("/api/admin")
@io.swagger.v3.oas.annotations.tags.Tag(name = "관리자")
public class AdminController {
    private final AdminService adminService;
    private final SecurityContextAccessor securityContextAccessor;
    private final InquiryService inquiryService;

    public AdminController(AdminService adminService, SecurityContextAccessor securityContextAccessor,
                           InquiryService inquiryService) {
        this.adminService = adminService;
        this.securityContextAccessor = securityContextAccessor;
        this.inquiryService = inquiryService;
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

    @GetMapping("/api-usages")
    @io.swagger.v3.oas.annotations.Operation(summary = "전체 외부 API 사용 이력 조회")
    public ApiResponse<PageResponse<ExternalApiUsageResponse>> apiUsages(
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return ApiResponse.success(adminService.externalApiUsages(page, size));
    }

    @GetMapping("/inquiries")
    @io.swagger.v3.oas.annotations.Operation(summary = "서비스 문의 목록 조회")
    public ApiResponse<PageResponse<InquiryResponse>> inquiries(
            @RequestParam(required = false) InquiryStatus status,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "10") @Min(1) @Max(100) int size) {
        return ApiResponse.success(inquiryService.findAll(status, page, size));
    }

    @PostMapping("/inquiries/{inquiryId}/reply")
    @io.swagger.v3.oas.annotations.Operation(summary = "서비스 문의 이메일 답변")
    public ApiResponse<InquiryResponse> replyInquiry(
            @PathVariable Long inquiryId,
            @Valid @RequestBody InquiryReplyRequest request) {
        return ApiResponse.success(inquiryService.reply(
                securityContextAccessor.getCurrentMemberId(), inquiryId, request));
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

    @PatchMapping("/members/{memberId}/sub-admin")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @io.swagger.v3.oas.annotations.Operation(summary = "부관리자 권한 부여")
    public ApiResponse<AdminMemberSummaryResponse> grantSubAdmin(@PathVariable Long memberId) {
        return ApiResponse.success(adminService.grantSubAdmin(
                securityContextAccessor.getCurrentMemberId(), memberId));
    }

    @DeleteMapping("/members/{memberId}/sub-admin")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @io.swagger.v3.oas.annotations.Operation(summary = "부관리자 권한 회수")
    public ApiResponse<AdminMemberSummaryResponse> revokeSubAdmin(@PathVariable Long memberId) {
        return ApiResponse.success(adminService.revokeSubAdmin(
                securityContextAccessor.getCurrentMemberId(), memberId));
    }

    @GetMapping("/action-logs")
    @io.swagger.v3.oas.annotations.Operation(summary = "관리자 감사 로그 조회")
    public ApiResponse<PageResponse<AdminActionLogResponse>> actionLogs(
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return ApiResponse.success(adminService.actionLogs(page, size));
    }
}
