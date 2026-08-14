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
    @Column(name = "access_code", unique = true, length = 6) private String accessCode;
    @Column(name = "code_expires_at") private LocalDateTime codeExpiresAt;
    @Column(name = "created_by", nullable = false) private Long createdBy;
    @Column(name = "expires_at", nullable = false) private LocalDateTime expiresAt;
    @Column(nullable = false, length = 20) private String status;
    @Column(name = "created_at", nullable = false) private LocalDateTime createdAt;

    protected TripInvitation() {}
    private TripInvitation(Long tripId, String inviteCode, String accessCode, Long createdBy,
                           LocalDateTime codeExpiresAt, LocalDateTime expiresAt) {
        this.tripId = tripId;
        this.inviteCode = inviteCode;
        this.accessCode = accessCode;
        this.codeExpiresAt = codeExpiresAt;
        this.createdBy = createdBy;
        this.expiresAt = expiresAt;
        this.status = "ACTIVE";
        this.createdAt = LocalDateTime.now();
    }
    public static TripInvitation create(Long tripId, String inviteCode, String accessCode, Long createdBy,
                                        LocalDateTime codeExpiresAt, LocalDateTime expiresAt) {
        return new TripInvitation(tripId, inviteCode, accessCode, createdBy, codeExpiresAt, expiresAt);
    }
    public boolean isLinkUsable(LocalDateTime now) {
        return "ACTIVE".equals(status) && expiresAt.isAfter(now);
    }
    public boolean isAccessCodeUsable(String code, LocalDateTime now) {
        return isLinkUsable(now) && accessCode != null && accessCode.equals(code)
                && codeExpiresAt != null && codeExpiresAt.isAfter(now);
    }
    public Long getTripId() { return tripId; }
    public String getInviteCode() { return inviteCode; }
    public String getAccessCode() { return accessCode; }
    public LocalDateTime getCodeExpiresAt() { return codeExpiresAt; }
    public LocalDateTime getExpiresAt() { return expiresAt; }
}
