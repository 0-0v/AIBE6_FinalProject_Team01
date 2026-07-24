package back.backend.domain.expense.dto;

import back.backend.domain.expense.entity.SplitType;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public record ExpenseCreateRequest(
        @NotBlank @Size(max = 100) String title,
        @NotBlank @Size(max = 30) String category,
        @NotNull @DecimalMin("0.01") BigDecimal totalAmount,
        @NotNull LocalDate expenseDate,
        @NotNull Long payerId,
        @NotNull SplitType splitType,
        @NotEmpty List<Long> participantIds,
        Map<Long, BigDecimal> customShares,
        @Size(max = 1000) String memo
) {}
