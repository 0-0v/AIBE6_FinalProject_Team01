package back.backend.domain.trip.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "trip_members")
public class TripMember {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "trip_id", nullable = false)
    private Long tripId;

    @Column(name = "member_id", nullable = false)
    private Long memberId;

    @Column(name = "joined_at", nullable = false)
    private LocalDateTime joinedAt;

    protected TripMember() {
    }

    private TripMember(Long tripId, Long memberId) {
        this.tripId = tripId;
        this.memberId = memberId;
        this.joinedAt = LocalDateTime.now();
    }

    public static TripMember member(Long tripId, Long memberId) {
        return new TripMember(tripId, memberId);
    }

    public Long getId() { return id; }
    public Long getTripId() { return tripId; }
    public Long getMemberId() { return memberId; }
    public LocalDateTime getJoinedAt() { return joinedAt; }
}
