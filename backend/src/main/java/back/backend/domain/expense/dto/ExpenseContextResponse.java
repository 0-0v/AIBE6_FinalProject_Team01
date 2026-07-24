package back.backend.domain.expense.dto;

import java.time.LocalDate;
import java.util.List;

public record ExpenseContextResponse(
        LocalDate startDate,
        LocalDate endDate,
        List<ExpenseMemberResponse> members,
        boolean scheduleConfirmed
) {}
