package back.backend.domain.expense.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.*;

@Entity
@Table(name = "expense_participants")
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class ExpenseParticipant {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "expense_id", nullable = false) private Long expenseId;
    @Column(name = "member_id", nullable = false) private Long memberId;
    @Column(name = "share_amount", nullable = false, precision = 12, scale = 2) private BigDecimal shareAmount;
    @Enumerated(EnumType.STRING)
    @Column(name = "settlement_status", nullable = false, length = 20)
    @Builder.Default
    private ParticipantSettlementStatus status = ParticipantSettlementStatus.PENDING;
    @Column(name = "settled_at") private LocalDateTime settledAt;
    @Column(name = "created_at", nullable = false) private LocalDateTime createdAt;

    @PrePersist
    void prePersist() {
        createdAt = LocalDateTime.now();
    }

    public void markSettled() {
        this.status = ParticipantSettlementStatus.COMPLETED;
        this.settledAt = LocalDateTime.now();
    }
}
