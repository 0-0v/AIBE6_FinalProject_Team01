package back.backend.domain.expense.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.*;

@Entity
@Table(name = "expenses")
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class Expense {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "trip_id", nullable = false) private Long tripId;
    @Column(name = "payer_id", nullable = false) private Long payerId;
    @Column(nullable = false, length = 100) private String title;
    @Column(nullable = false, length = 30) private String category;
    @Column(name = "total_amount", nullable = false, precision = 12, scale = 2) private BigDecimal totalAmount;
    @Column(nullable = false, length = 10) private String currency;
    @Column(name = "expense_date", nullable = false) private LocalDate expenseDate;
    @Enumerated(EnumType.STRING) @Column(name = "split_type", nullable = false, length = 20) private SplitType splitType;
    @Column(name = "receipt_url", length = 500) private String receiptUrl;
    @Column(columnDefinition = "TEXT") private String memo;
    @Column(name = "created_by", nullable = false) private Long createdBy;
    @Column(name = "created_at", nullable = false) private LocalDateTime createdAt;
    @Column(name = "updated_at", nullable = false) private LocalDateTime updatedAt;

    @PrePersist
    void prePersist() {
        createdAt = LocalDateTime.now();
        updatedAt = createdAt;
    }
}
