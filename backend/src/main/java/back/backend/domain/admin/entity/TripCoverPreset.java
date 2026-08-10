package back.backend.domain.admin.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.Objects;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

@Entity
@Table(name = "trip_cover_presets")
@EntityListeners(AuditingEntityListener.class)
public class TripCoverPreset {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "preset_key", nullable = false, unique = true, length = 50)
    private String presetKey;
    @Column(name = "image_url", nullable = false, length = 500)
    private String imageUrl;
    @Column(nullable = false)
    private boolean active;
    @Column(name = "sort_order", nullable = false)
    private int sortOrder;
    @Column(name = "created_by")
    private Long createdBy;
    @CreatedDate @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    @LastModifiedDate @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected TripCoverPreset() {}
    private TripCoverPreset(String presetKey, String imageUrl, int sortOrder, Long createdBy) {
        this.presetKey = Objects.requireNonNull(presetKey);
        this.imageUrl = Objects.requireNonNull(imageUrl);
        this.active = true;
        this.sortOrder = sortOrder;
        this.createdBy = createdBy;
    }
    public static TripCoverPreset create(String key, String url, int order, Long adminId) {
        return new TripCoverPreset(key, url, order, adminId);
    }
    public void activate() { active = true; }
    public void deactivate() { active = false; }
    public Long getId() { return id; }
    public String getPresetKey() { return presetKey; }
    public String getImageUrl() { return imageUrl; }
    public boolean isActive() { return active; }
    public int getSortOrder() { return sortOrder; }
    public Long getCreatedBy() { return createdBy; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
