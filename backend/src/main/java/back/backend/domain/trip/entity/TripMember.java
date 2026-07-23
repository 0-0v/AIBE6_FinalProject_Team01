package back.backend.domain.trip.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TripMemberRole role;

    @Column(name = "joined_at", nullable = false)
    private LocalDateTime joinedAt;

    protected TripMember() {
    }

    private TripMember(Long tripId, Long memberId, TripMemberRole role) {
        this.tripId = tripId;
        this.memberId = memberId;
        this.role = role;
        this.joinedAt = LocalDateTime.now();
    }

    public static TripMember owner(Long tripId, Long memberId) {
        return new TripMember(tripId, memberId, TripMemberRole.OWNER);
    }

    public Long getId() { return id; }
    public Long getTripId() { return tripId; }
    public Long getMemberId() { return memberId; }
    public TripMemberRole getRole() { return role; }
    public LocalDateTime getJoinedAt() { return joinedAt; }
}
