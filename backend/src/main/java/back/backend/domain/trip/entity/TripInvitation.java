package back.backend.domain.trip.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "trip_invitations")
public class TripInvitation {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "trip_id", nullable = false) private Long tripId;
    @Column(name = "invite_code", nullable = false, unique = true, length = 100) private String inviteCode;
    @Column(name = "created_by", nullable = false) private Long createdBy;
    @Column(name = "expires_at", nullable = false) private LocalDateTime expiresAt;
    @Column(nullable = false, length = 20) private String status;
    @Column(name = "created_at", nullable = false) private LocalDateTime createdAt;

    protected TripInvitation() {}
    private TripInvitation(Long tripId, String inviteCode, Long createdBy, LocalDateTime expiresAt) {
        this.tripId = tripId;
        this.inviteCode = inviteCode;
        this.createdBy = createdBy;
        this.expiresAt = expiresAt;
        this.status = "ACTIVE";
        this.createdAt = LocalDateTime.now();
    }
    public static TripInvitation create(Long tripId, String code, Long createdBy, LocalDateTime expiresAt) {
        return new TripInvitation(tripId, code, createdBy, expiresAt);
    }
    public boolean isUsable(LocalDateTime now) { return "ACTIVE".equals(status) && expiresAt.isAfter(now); }
    public Long getTripId() { return tripId; }
    public String getInviteCode() { return inviteCode; }
    public LocalDateTime getExpiresAt() { return expiresAt; }
}
