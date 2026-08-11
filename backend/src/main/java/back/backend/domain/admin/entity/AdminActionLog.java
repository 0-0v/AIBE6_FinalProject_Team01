package back.backend.domain.admin.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.util.Objects;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

@Entity
@Table(name = "admin_action_logs")
@EntityListeners(AuditingEntityListener.class)
public class AdminActionLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "admin_id", nullable = false)
    private Long adminId;

    @Enumerated(EnumType.STRING)
    @Column(name = "action_type", nullable = false, length = 50)
    private AdminActionType actionType;

    @Column(name = "target_type", nullable = false, length = 30)
    private String targetType;

    @Column(name = "target_id", nullable = false)
    private Long targetId;

    @Column(nullable = false, length = 500)
    private String reason;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    protected AdminActionLog() {}

    private AdminActionLog(Long adminId, AdminActionType actionType, String targetType,
                           Long targetId, String reason) {
        this.adminId = Objects.requireNonNull(adminId);
        this.actionType = Objects.requireNonNull(actionType);
        this.targetType = Objects.requireNonNull(targetType);
        this.targetId = Objects.requireNonNull(targetId);
        this.reason = Objects.requireNonNull(reason).strip();
    }

    public static AdminActionLog create(Long adminId, AdminActionType actionType,
                                        String targetType, Long targetId, String reason) {
        return new AdminActionLog(adminId, actionType, targetType, targetId, reason);
    }

    public Long getId() { return id; }
    public Long getAdminId() { return adminId; }
    public AdminActionType getActionType() { return actionType; }
    public String getTargetType() { return targetType; }
    public Long getTargetId() { return targetId; }
    public String getReason() { return reason; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
