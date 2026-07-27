package back.backend.domain.card.entity;

import back.backend.domain.trip.entity.TripVisibility;
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
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

@Entity
@Table(name = "plan_cards")
@EntityListeners(AuditingEntityListener.class)
public class PlanCard {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "trip_id", nullable = false)
    private Long tripId;
    @Column(nullable = false, length = 100)
    private String title;
    @Column(columnDefinition = "TEXT")
    private String summary;
    @Column(name = "cover_image_url", length = 500)
    private String coverImageUrl;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TripVisibility visibility;
    @Column(name = "created_by", nullable = false)
    private Long createdBy;
    @CreatedDate @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    @LastModifiedDate @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected PlanCard() {}
    private PlanCard(Long tripId, String title, TripVisibility visibility, Long createdBy) {
        this.tripId = tripId;
        this.title = title;
        this.visibility = visibility;
        this.createdBy = createdBy;
    }
    public static PlanCard create(Long tripId, String title, TripVisibility visibility, Long createdBy) {
        return new PlanCard(tripId, title, visibility, createdBy);
    }
    public Long getId() { return id; }
    public Long getTripId() { return tripId; }
    public String getTitle() { return title; }
    public String getSummary() { return summary; }
    public String getCoverImageUrl() { return coverImageUrl; }
    public Long getCreatedBy() { return createdBy; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public TripVisibility getVisibility() { return visibility; }
    public void changeVisibility(TripVisibility visibility) {
        this.visibility = java.util.Objects.requireNonNull(visibility, "visibility must not be null");
    }
}
