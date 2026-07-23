package back.backend.domain.card.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "plan_card_tags")
public class PlanCardTag {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "plan_card_id", nullable = false) private Long planCardId;
    @Column(name = "tag_id", nullable = false) private Long tagId;
    @Column(name = "created_at", nullable = false) private LocalDateTime createdAt;
    protected PlanCardTag() {}
    private PlanCardTag(Long planCardId, Long tagId) {
        this.planCardId = planCardId;
        this.tagId = tagId;
        this.createdAt = LocalDateTime.now();
    }
    public static PlanCardTag create(Long planCardId, Long tagId) { return new PlanCardTag(planCardId, tagId); }
}
