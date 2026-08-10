package back.backend.domain.expense.controller;

import back.backend.domain.expense.dto.*;
import back.backend.domain.expense.service.ExpenseService;
import back.backend.global.response.ApiResponse;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/trips/{tripId}/expenses")
@io.swagger.v3.oas.annotations.tags.Tag(name = "지출·정산")
public class ExpenseController {
    private final ExpenseService expenseService;
    public ExpenseController(ExpenseService expenseService) { this.expenseService = expenseService; }

    @PostMapping
    @io.swagger.v3.oas.annotations.Operation(summary = "여행 지출 등록")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<ExpenseResponse> create(
            @PathVariable Long tripId, @Valid @RequestBody ExpenseCreateRequest request) {
        return ApiResponse.success(expenseService.create(tripId, request));
    }

    @PutMapping("/{expenseId}")
    @io.swagger.v3.oas.annotations.Operation(summary = "여행 지출 수정")
    public ApiResponse<ExpenseResponse> update(
            @PathVariable Long tripId, @PathVariable Long expenseId,
            @Valid @RequestBody ExpenseUpdateRequest request) {
        return ApiResponse.success(expenseService.update(tripId, expenseId, request));
    }

    @GetMapping
    @io.swagger.v3.oas.annotations.Operation(summary = "여행 지출 목록 조회")
    public ApiResponse<List<ExpenseResponse>> getExpenses(@PathVariable Long tripId) {
        return ApiResponse.success(expenseService.getExpenses(tripId));
    }

    @GetMapping("/context")
    @io.swagger.v3.oas.annotations.Operation(summary = "지출 등록용 여행 정보 조회")
    public ApiResponse<ExpenseContextResponse> getContext(@PathVariable Long tripId) {
        return ApiResponse.success(expenseService.getContext(tripId));
    }

    @GetMapping("/settlement")
    @io.swagger.v3.oas.annotations.Operation(summary = "여행 최종 정산표 조회")
    public ApiResponse<SettlementSummaryResponse> getSettlement(@PathVariable Long tripId) {
        return ApiResponse.success(expenseService.getSettlement(tripId));
    }

    @PatchMapping("/{expenseId}/participants/{memberId}/complete")
    @io.swagger.v3.oas.annotations.Operation(summary = "참여자 정산 완료 상태 변경")
    public ApiResponse<ExpenseResponse> completeParticipant(
            @PathVariable Long tripId, @PathVariable Long expenseId, @PathVariable Long memberId) {
        return ApiResponse.success(expenseService.completeParticipant(tripId, expenseId, memberId));
    }
}
