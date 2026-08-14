package back.backend.domain.trip.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "guest_sessions")
public class GuestSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "token_hash", nullable = false, unique = true, length = 64)
    private String tokenHash;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "claimed_at")
    private LocalDateTime claimedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    protected GuestSession() {
    }

    private GuestSession(String tokenHash, LocalDateTime expiresAt) {
        this.tokenHash = tokenHash;
        this.expiresAt = expiresAt;
        this.createdAt = LocalDateTime.now();
    }

    public static GuestSession create(String tokenHash, LocalDateTime expiresAt) {
        return new GuestSession(tokenHash, expiresAt);
    }

    public boolean isUsable(LocalDateTime now) {
        return claimedAt == null && expiresAt.isAfter(now);
    }

    public void claim(LocalDateTime claimedAt) {
        this.claimedAt = claimedAt;
    }

    public void extendUntil(LocalDateTime newExpiresAt) {
        if (newExpiresAt.isAfter(expiresAt)) {
            expiresAt = newExpiresAt;
        }
    }

    public Long getId() { return id; }
    public String getTokenHash() { return tokenHash; }
    public LocalDateTime getExpiresAt() { return expiresAt; }
    public LocalDateTime getClaimedAt() { return claimedAt; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
