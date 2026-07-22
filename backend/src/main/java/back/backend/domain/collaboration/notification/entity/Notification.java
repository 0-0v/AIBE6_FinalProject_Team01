package back.backend.domain.collaboration.notification.entity;

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
@Table(name = "notifications")
@EntityListeners(AuditingEntityListener.class)
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "member_id", nullable = false)
    private Long memberId;

    @Column(name = "trip_id")
    private Long tripId;

    @Enumerated(EnumType.STRING)
    @Column(name = "notification_type", nullable = false, length = 30)
    private NotificationType notificationType;

    @Column(length = 100)
    private String title;

    @Column(nullable = false, length = 500)
    private String content;

    @Column(name = "target_type", length = 30)
    private String targetType;

    @Column(name = "target_id")
    private Long targetId;

    @Column(name = "is_read", nullable = false)
    private boolean read;

    @Column(name = "read_at")
    private LocalDateTime readAt;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    protected Notification() {
    }

    private Notification(
            Long memberId,
            Long tripId,
            NotificationType notificationType,
            String title,
            String content,
            String targetType,
            Long targetId
    ) {
        this.memberId = Objects.requireNonNull(memberId, "memberId must not be null");
        this.tripId = tripId;
        this.notificationType = Objects.requireNonNull(notificationType, "notificationType must not be null");
        this.title = title;
        this.content = Objects.requireNonNull(content, "content must not be null");
        this.targetType = targetType;
        this.targetId = targetId;
        this.read = false;
    }

    public static Notification create(
            Long memberId,
            Long tripId,
            NotificationType notificationType,
            String title,
            String content,
            String targetType,
            Long targetId
    ) {
        return new Notification(memberId, tripId, notificationType, title, content, targetType, targetId);
    }

    public Long getId() {
        return id;
    }

    public Long getMemberId() {
        return memberId;
    }

    public Long getTripId() {
        return tripId;
    }

    public NotificationType getNotificationType() {
        return notificationType;
    }

    public String getTitle() {
        return title;
    }

    public String getContent() {
        return content;
    }

    public String getTargetType() {
        return targetType;
    }

    public Long getTargetId() {
        return targetId;
    }

    public boolean isRead() {
        return read;
    }

    public LocalDateTime getReadAt() {
        return readAt;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void markAsRead(LocalDateTime readAt) {
        if (read) {
            return;
        }
        this.read = true;
        this.readAt = Objects.requireNonNull(readAt, "readAt must not be null");
    }
}
