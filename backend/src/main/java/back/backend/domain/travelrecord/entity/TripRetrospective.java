package back.backend.domain.travelrecord.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

@Entity
@Table(name = "trip_retrospectives")
@EntityListeners(AuditingEntityListener.class)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class TripRetrospective {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "trip_id", nullable = false)
    private Long tripId;

    @Column(name = "member_id", nullable = false)
    private Long memberId;

    @Column(name = "good_points", columnDefinition = "TEXT")
    private String goodPoints;

    @Column(columnDefinition = "TEXT")
    private String improvements;

    @Column(columnDefinition = "TEXT")
    private String summary;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public static TripRetrospective create(Long tripId, Long memberId) {
        TripRetrospective retrospective = new TripRetrospective();
        retrospective.tripId = tripId;
        retrospective.memberId = memberId;
        return retrospective;
    }

    public void update(String goodPoints, String improvements, String summary) {
        this.goodPoints = normalize(goodPoints);
        this.improvements = normalize(improvements);
        this.summary = normalize(summary);
    }

    private static String normalize(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
