package back.backend.domain.expense.dto;

import java.math.BigDecimal;
import java.util.List;

public record SettlementSummaryResponse(
        BigDecimal totalExpense,
        List<MemberBalance> members,
        List<Transfer> transfers
) {
    public record MemberBalance(
            Long memberId, String nickname, BigDecimal paidAmount,
            BigDecimal shareAmount, BigDecimal balance
    ) {}
    public record Transfer(
            Long senderId, String senderNickname, Long receiverId,
            String receiverNickname, BigDecimal amount
    ) {}
}
