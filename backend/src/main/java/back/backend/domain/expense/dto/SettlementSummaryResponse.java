package back.backend.domain.expense.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
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
            String receiverNickname, BigDecimal amount, Long settlementId,
            String status, LocalDateTime completedAt, boolean canComplete
    ) {
        public Transfer(
                Long senderId, String senderNickname, Long receiverId,
                String receiverNickname, BigDecimal amount
        ) {
            this(senderId, senderNickname, receiverId, receiverNickname, amount,
                    null, "PENDING", null, false);
        }

        public static Transfer completed(
                Long settlementId, Long senderId, String senderNickname,
                Long receiverId, String receiverNickname, BigDecimal amount,
                LocalDateTime completedAt, boolean canComplete
        ) {
            return new Transfer(
                    senderId, senderNickname, receiverId, receiverNickname, amount,
                    settlementId, "COMPLETED", completedAt, canComplete);
        }
    }
}
