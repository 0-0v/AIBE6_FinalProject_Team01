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
@Table(name = "trip_guest_members")
public class TripGuestMember {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "trip_id", nullable = false)
    private Long tripId;

    @Column(name = "guest_session_id", nullable = false)
    private Long guestSessionId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TripMemberRole role;

    @Column(name = "joined_at", nullable = false)
    private LocalDateTime joinedAt;

    protected TripGuestMember() {
    }

    private TripGuestMember(Long tripId, Long guestSessionId) {
        this.tripId = tripId;
        this.guestSessionId = guestSessionId;
        this.role = TripMemberRole.VIEWER;
        this.joinedAt = LocalDateTime.now();
    }

    public static TripGuestMember viewer(Long tripId, Long guestSessionId) {
        return new TripGuestMember(tripId, guestSessionId);
    }

    public Long getId() { return id; }
    public Long getTripId() { return tripId; }
    public Long getGuestSessionId() { return guestSessionId; }
    public TripMemberRole getRole() { return role; }
    public LocalDateTime getJoinedAt() { return joinedAt; }
}
