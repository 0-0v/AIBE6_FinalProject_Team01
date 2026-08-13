package back.backend.domain.place.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "places")
@EntityListeners(AuditingEntityListener.class)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor
public class Place {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "google_place_id", nullable = false, unique = true, length = 255)
    private String googlePlaceId;

    @Column(nullable = false, length = 255)
    private String name;

    @Column(length = 500)
    private String address;

    @Column(nullable = false, precision = 10, scale = 7)
    private BigDecimal latitude;

    @Column(nullable = false, precision = 10, scale = 7)
    private BigDecimal longitude;

    @Column(name = "place_type", length = 100)
    private String placeType;

    @Column(name = "google_photo_name", length = 1000)
    private String googlePhotoName;

    @Column(name = "website_url", length = 500)
    private String websiteUrl;

    @Column(name = "opening_hours_json", columnDefinition = "TEXT")
    private String openingHoursJson;

    @Column(name = "google_content_fetched_at", nullable = false)
    private LocalDateTime googleContentFetchedAt;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public void refreshGoogleContent(Place source) {
        name = source.name;
        address = source.address;
        latitude = source.latitude;
        longitude = source.longitude;
        placeType = source.placeType;
        googleContentFetchedAt = source.googleContentFetchedAt;
    }

    @PrePersist
    void initializeGoogleContentFetchedAt() {
        if (googleContentFetchedAt == null) {
            googleContentFetchedAt = LocalDateTime.now();
        }
    }
}
