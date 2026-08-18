package back.backend.domain.member.entity;

import java.time.LocalDateTime;
import java.util.Objects;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

@Entity
@Table(name = "members", uniqueConstraints = {
        @UniqueConstraint(name = "uk_members_email", columnNames = {"email"}),
        @UniqueConstraint(name = "uk_members_provider_provider_id", columnNames = {"provider", "provider_id"})
})
@EntityListeners(AuditingEntityListener.class)
public class Member {

    public static final String WITHDRAWN_NICKNAME = "탈퇴한 사용자";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 255)
    private String email;

    @Column(nullable = false, length = 50)
    private String nickname;

    @Column(name = "profile_image_url", length = 500)
    private String profileImageUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AuthProvider provider;

    @Column(name = "provider_id", nullable = false, length = 255)
    private String providerId;

    @Column(name = "password_hash", length = 100)
    private String passwordHash;

    @Column(name = "email_verified_at")
    private LocalDateTime emailVerifiedAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private MemberStatus status;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private MemberRole role;

    @Column(name = "suspension_reason", length = 500)
    private String suspensionReason;

    @Column(name = "suspended_at")
    private LocalDateTime suspendedAt;

    @Column(name = "suspended_until")
    private LocalDateTime suspendedUntil;

    @Column(name = "suspended_by")
    private Long suspendedBy;

    @Column(name = "last_login_at")
    private LocalDateTime lastLoginAt;

    @Column(name = "withdrawn_at")
    private LocalDateTime withdrawnAt;

    @Column(name = "personal_info_expires_at")
    private LocalDateTime personalInfoExpiresAt;

    @Column(name = "personal_info_deleted_at")
    private LocalDateTime personalInfoDeletedAt;

    @Column(name = "token_version", nullable = false)
    private long tokenVersion;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected Member() {
    }

    private Member(String email, String nickname, String profileImageUrl, AuthProvider provider, String providerId) {
        this.email = Objects.requireNonNull(email, "email must not be null");
        this.nickname = Objects.requireNonNull(nickname, "nickname must not be null");
        this.profileImageUrl = profileImageUrl;
        this.provider = Objects.requireNonNull(provider, "provider must not be null");
        this.providerId = Objects.requireNonNull(providerId, "providerId must not be null");
        this.status = MemberStatus.ACTIVE;
        this.role = MemberRole.USER;
    }

    public static Member create(
            String email,
            String nickname,
            String profileImageUrl,
            AuthProvider provider,
            String providerId
    ) {
        return new Member(email, nickname, profileImageUrl, provider, providerId);
    }

    public static Member createLocal(String email, String nickname, String passwordHash) {
        Member member = new Member(email, nickname, null, AuthProvider.LOCAL, email);
        member.passwordHash = Objects.requireNonNull(passwordHash, "passwordHash must not be null");
        member.emailVerifiedAt = LocalDateTime.now();
        return member;
    }

    public Long getId() {
        return id;
    }

    public String getEmail() {
        return email;
    }

    public String getNickname() {
        if (status == MemberStatus.WITHDRAWN) {
            return WITHDRAWN_NICKNAME;
        }
        return nickname;
    }

    public String getProfileImageUrl() {
        if (status == MemberStatus.WITHDRAWN) {
            return null;
        }
        return profileImageUrl;
    }

    public AuthProvider getProvider() {
        return provider;
    }

    public String getProviderId() {
        return providerId;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public LocalDateTime getEmailVerifiedAt() {
        return emailVerifiedAt;
    }

    public MemberStatus getStatus() {
        return status;
    }

    public MemberRole getRole() {
        return role;
    }

    public String getSuspensionReason() {
        return suspensionReason;
    }

    public LocalDateTime getSuspendedAt() {
        return suspendedAt;
    }

    public LocalDateTime getSuspendedUntil() {
        return suspendedUntil;
    }

    public Long getSuspendedBy() {
        return suspendedBy;
    }

    public LocalDateTime getLastLoginAt() {
        return lastLoginAt;
    }

    public LocalDateTime getWithdrawnAt() {
        return withdrawnAt;
    }

    public LocalDateTime getPersonalInfoExpiresAt() {
        return personalInfoExpiresAt;
    }

    public LocalDateTime getPersonalInfoDeletedAt() {
        return personalInfoDeletedAt;
    }

    public long getTokenVersion() {
        return tokenVersion;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void recordLogin() {
        this.lastLoginAt = LocalDateTime.now();
    }

    public void promoteToAdmin() {
        this.role = MemberRole.ADMIN;
    }

    public void promoteToSubAdmin() {
        if (status == MemberStatus.WITHDRAWN) {
            throw new IllegalStateException("탈퇴 회원은 부관리자로 지정할 수 없습니다.");
        }
        this.role = MemberRole.SUB_ADMIN;
    }

    public void revokeSubAdmin() {
        if (role != MemberRole.SUB_ADMIN) {
            throw new IllegalStateException("부관리자 계정만 권한을 회수할 수 있습니다.");
        }
        this.role = MemberRole.USER;
    }

    public void reconfigureAdminLocalIdentity(
            String email,
            String nickname,
            String passwordHash
    ) {
        if (provider != AuthProvider.LOCAL || role != MemberRole.ADMIN) {
            throw new IllegalStateException("로컬 관리자 계정만 재설정할 수 있습니다.");
        }
        this.email = Objects.requireNonNull(email, "email must not be null");
        this.providerId = email;
        this.nickname = Objects.requireNonNull(nickname, "nickname must not be null");
        this.passwordHash = Objects.requireNonNull(passwordHash, "passwordHash must not be null");
        invalidateTokens();
    }

    public void suspend(
            Long adminId,
            String reason,
            LocalDateTime suspendedAt,
            LocalDateTime suspendedUntil
    ) {
        if (status == MemberStatus.WITHDRAWN) {
            throw new IllegalStateException("탈퇴 회원은 정지할 수 없습니다.");
        }
        String normalizedReason = Objects.requireNonNull(reason, "reason must not be null").strip();
        if (normalizedReason.isBlank()) {
            throw new IllegalArgumentException("정지 사유는 필수입니다.");
        }
        LocalDateTime normalizedSuspendedAt =
                Objects.requireNonNull(suspendedAt, "suspendedAt must not be null");
        if (suspendedUntil != null && !suspendedUntil.isAfter(normalizedSuspendedAt)) {
            throw new IllegalArgumentException("정지 종료 시각은 시작 시각보다 이후여야 합니다.");
        }
        this.status = MemberStatus.SUSPENDED;
        this.suspendedBy = Objects.requireNonNull(adminId, "adminId must not be null");
        this.suspensionReason = normalizedReason;
        this.suspendedAt = normalizedSuspendedAt;
        this.suspendedUntil = suspendedUntil;
        invalidateTokens();
    }

    public void releaseSuspension() {
        if (status != MemberStatus.SUSPENDED) {
            return;
        }
        this.status = MemberStatus.ACTIVE;
        this.suspendedBy = null;
        this.suspensionReason = null;
        this.suspendedAt = null;
        this.suspendedUntil = null;
    }

    public boolean releaseSuspensionIfExpired(LocalDateTime now) {
        Objects.requireNonNull(now, "now must not be null");
        if (status != MemberStatus.SUSPENDED || suspendedUntil == null
                || now.isBefore(suspendedUntil)) {
            return false;
        }
        releaseSuspension();
        return true;
    }

    public void changeNickname(String nickname) {
        this.nickname = Objects.requireNonNull(nickname, "nickname must not be null");
    }

    public void changeProfileImage(String profileImageUrl) {
        this.profileImageUrl = profileImageUrl;
    }

    public void changePassword(String passwordHash) {
        if (provider != AuthProvider.LOCAL) {
            throw new IllegalStateException("로컬 회원만 비밀번호를 변경할 수 있습니다.");
        }
        this.passwordHash = Objects.requireNonNull(passwordHash, "passwordHash must not be null");
        invalidateTokens();
    }

    public void withdraw(LocalDateTime withdrawnAt, LocalDateTime personalInfoExpiresAt) {
        if (status == MemberStatus.WITHDRAWN) {
            return;
        }
        this.status = MemberStatus.WITHDRAWN;
        this.suspendedBy = null;
        this.suspensionReason = null;
        this.suspendedAt = null;
        this.suspendedUntil = null;
        this.withdrawnAt = Objects.requireNonNull(withdrawnAt, "withdrawnAt must not be null");
        this.personalInfoExpiresAt =
                Objects.requireNonNull(personalInfoExpiresAt, "personalInfoExpiresAt must not be null");
        invalidateTokens();
    }

    public void invalidateTokens() {
        tokenVersion++;
    }

    public String anonymizePersonalInfo(LocalDateTime deletedAt) {
        if (id == null) {
            throw new IllegalStateException("저장되지 않은 회원은 익명화할 수 없습니다.");
        }
        String storedProfileImageUrl = profileImageUrl;
        this.email = "withdrawn-" + id + "@deleted.invalid";
        this.nickname = "withdrawn-" + id;
        this.profileImageUrl = null;
        this.providerId = "withdrawn-" + id;
        this.passwordHash = null;
        this.emailVerifiedAt = null;
        this.lastLoginAt = null;
        this.personalInfoDeletedAt = Objects.requireNonNull(deletedAt, "deletedAt must not be null");
        return storedProfileImageUrl;
    }
}
