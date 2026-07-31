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
public class ExpenseController {
    private final ExpenseService expenseService;
    public ExpenseController(ExpenseService expenseService) { this.expenseService = expenseService; }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<ExpenseResponse> create(
            @PathVariable Long tripId, @Valid @RequestBody ExpenseCreateRequest request) {
        return ApiResponse.success(expenseService.create(tripId, request));
    }

    @GetMapping
    public ApiResponse<List<ExpenseResponse>> getExpenses(@PathVariable Long tripId) {
        return ApiResponse.success(expenseService.getExpenses(tripId));
    }

    @GetMapping("/context")
    public ApiResponse<ExpenseContextResponse> getContext(@PathVariable Long tripId) {
        return ApiResponse.success(expenseService.getContext(tripId));
    }

    @GetMapping("/settlement")
    public ApiResponse<SettlementSummaryResponse> getSettlement(@PathVariable Long tripId) {
        return ApiResponse.success(expenseService.getSettlement(tripId));
    }

    @PatchMapping("/settlement/transfers/{receiverId}/complete")
    public ApiResponse<SettlementSummaryResponse.Transfer> completeTransfer(
            @PathVariable Long tripId, @PathVariable Long receiverId) {
        return ApiResponse.success(expenseService.completeTransfer(tripId, receiverId));
    }
}
