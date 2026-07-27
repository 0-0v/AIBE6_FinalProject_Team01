package back.backend.domain.card.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

@Entity
@Table(name = "card_comments")
@EntityListeners(AuditingEntityListener.class)
public class CardComment {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "plan_card_id", nullable = false) private Long planCardId;
    @Column(name = "member_id", nullable = false) private Long memberId;
    @Column(nullable = false, columnDefinition = "TEXT") private String content;
    @CreatedDate @Column(name = "created_at", nullable = false, updatable = false) private LocalDateTime createdAt;
    @LastModifiedDate @Column(name = "updated_at", nullable = false) private LocalDateTime updatedAt;
    protected CardComment() {}
    private CardComment(Long planCardId, Long memberId, String content) {
        this.planCardId = planCardId;
        this.memberId = memberId;
        this.content = content.trim();
    }
    public static CardComment create(Long planCardId, Long memberId, String content) {
        return new CardComment(planCardId, memberId, content);
    }
    public Long getId() { return id; }
    public Long getPlanCardId() { return planCardId; }
    public Long getMemberId() { return memberId; }
    public String getContent() { return content; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
