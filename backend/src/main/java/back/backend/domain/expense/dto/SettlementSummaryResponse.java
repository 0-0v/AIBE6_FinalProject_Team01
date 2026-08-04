package back.backend.domain.expense.dto;

import java.math.BigDecimal;

public record SettlementSummaryResponse(
        BigDecimal totalExpense,
        BigDecimal myReceivable,
        BigDecimal myPayable,
        int pendingExpenseCount,
        int completedExpenseCount
) {}
