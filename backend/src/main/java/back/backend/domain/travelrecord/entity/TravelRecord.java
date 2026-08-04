package back.backend.domain.travelrecord.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

@Entity
@Table(name = "travel_records")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class TravelRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "trip_id", nullable = false)
    private Long tripId;

    @Column(name = "itinerary_item_id")
    private Long itineraryItemId;

    @Column(name = "place_id", nullable = false)
    private Long placeId;

    @Column(name = "recorded_by", nullable = false)
    private Long recordedBy;

    @Column(name = "visited_at", nullable = false)
    private LocalDateTime visitedAt;

    @Column(columnDefinition = "TEXT")
    private String memo;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public void updateContent(String memo) {
        this.memo = memo;
    }

    public void moveVisitedAtByDays(long days) {
        this.visitedAt = this.visitedAt.plusDays(days);
    }

    public void moveVisitedDateTo(LocalDate visitedDate) {
        this.visitedAt = LocalDateTime.of(visitedDate, this.visitedAt.toLocalTime());
    }
}
