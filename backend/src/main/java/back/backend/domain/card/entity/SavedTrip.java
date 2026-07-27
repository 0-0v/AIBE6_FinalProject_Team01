package back.backend.domain.card.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "saved_trips", uniqueConstraints = @UniqueConstraint(
        name = "uk_saved_trips_member_trip", columnNames = {"member_id", "trip_id"}))
public class SavedTrip {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "member_id", nullable = false) private Long memberId;
    @Column(name = "trip_id", nullable = false) private Long tripId;
    @Column(name = "saved_at", nullable = false) private LocalDateTime savedAt;
    protected SavedTrip() {}
    private SavedTrip(Long memberId, Long tripId) {
        this.memberId = memberId;
        this.tripId = tripId;
        this.savedAt = LocalDateTime.now();
    }
    public static SavedTrip create(Long memberId, Long tripId) { return new SavedTrip(memberId, tripId); }
    public Long getMemberId() { return memberId; }
    public Long getTripId() { return tripId; }
}
