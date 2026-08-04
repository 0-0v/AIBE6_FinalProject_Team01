package back.backend.domain.collaboration.activitylog.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

@Entity
@Table(name = "activity_logs")
@EntityListeners(AuditingEntityListener.class)
public class ActivityLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "trip_id", nullable = false)
    private Long tripId;

    @Column(name = "member_id")
    private Long memberId;

    @Column(name = "action_type", nullable = false, length = 30)
    private String actionType;

    @Column(name = "target_type", length = 30)
    private String targetType;

    @Column(name = "target_id")
    private Long targetId;

    @Column(nullable = false, length = 500)
    private String description;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "metadata_json", columnDefinition = "json")
    private Map<String, Object> metadata;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    protected ActivityLog() {
    }

    private ActivityLog(
            Long tripId,
            Long memberId,
            String actionType,
            String targetType,
            Long targetId,
            String description,
            Map<String, Object> metadata
    ) {
        this.tripId = Objects.requireNonNull(tripId, "tripId must not be null");
        this.memberId = memberId;
        this.actionType = Objects.requireNonNull(actionType, "actionType must not be null");
        this.targetType = targetType;
        this.targetId = targetId;
        this.description = Objects.requireNonNull(description, "description must not be null");
        this.metadata = metadata == null ? null : new LinkedHashMap<>(metadata);
    }

    public static ActivityLog create(
            Long tripId,
            Long memberId,
            String actionType,
            String targetType,
            Long targetId,
            String description,
            Map<String, Object> metadata
    ) {
        return new ActivityLog(
                tripId,
                memberId,
                actionType,
                targetType,
                targetId,
                description,
                metadata
        );
    }

    public Long getId() {
        return id;
    }

    public Long getTripId() {
        return tripId;
    }

    public Long getMemberId() {
        return memberId;
    }

    public String getActionType() {
        return actionType;
    }

    public String getTargetType() {
        return targetType;
    }

    public Long getTargetId() {
        return targetId;
    }

    public String getDescription() {
        return description;
    }

    public Map<String, Object> getMetadata() {
        return metadata == null
                ? null
                : Collections.unmodifiableMap(new LinkedHashMap<>(metadata));
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
