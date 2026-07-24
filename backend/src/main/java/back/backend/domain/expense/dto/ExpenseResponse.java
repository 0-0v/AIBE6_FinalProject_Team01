package back.backend.domain.expense.dto;

import back.backend.domain.expense.entity.SplitType;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record ExpenseResponse(
        Long id, String title, String category, BigDecimal totalAmount, String currency,
        LocalDate expenseDate, Integer dayNumber, Long payerId, String payerNickname,
        SplitType splitType, List<ParticipantShareResponse> participants, String memo
) {
    public record ParticipantShareResponse(Long memberId, String nickname, BigDecimal shareAmount) {}
}
