package back.backend.domain.card.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

@Entity
@Table(name = "trip_tags")
@EntityListeners(AuditingEntityListener.class)
public class TripTag {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "trip_id", nullable = false)
    private Long tripId;
    @Column(nullable = false, length = 50)
    private String name;
    @Column(length = 20) private String color;
    @Column(length = 50) private String icon;
    @Column(name = "created_by", nullable = false) private Long createdBy;
    @Column(name = "sort_order", nullable = false) private int sortOrder;
    @CreatedDate @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    protected TripTag() {}
    private TripTag(Long tripId, String name, Long createdBy, int sortOrder) {
        this.tripId = tripId;
        this.name = name;
        this.createdBy = createdBy;
        this.sortOrder = sortOrder;
    }
    public static TripTag create(Long tripId, String name, Long createdBy, int sortOrder) {
        return new TripTag(tripId, name, createdBy, sortOrder);
    }
    public Long getId() { return id; }
    public String getName() { return name; }
}
