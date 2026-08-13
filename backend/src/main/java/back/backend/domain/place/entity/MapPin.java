package back.backend.domain.place.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.persistence.PrePersist;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(
        name = "map_pins",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_map_pins_trip_place",
                columnNames = {"trip_id", "google_place_id"}
        )
)
@Getter
@Builder
@AllArgsConstructor
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MapPin {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "trip_id", nullable = false)
    private Long tripId;

    @Column(name = "google_place_id", nullable = false, length = 255)
    private String googlePlaceId;

    @Column(nullable = false)
    private Double lat;

    @Column(nullable = false)
    private Double lng;

    @Column(name = "place_name", nullable = false, length = 255)
    private String placeName;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "google_content_fetched_at", nullable = false)
    private LocalDateTime googleContentFetchedAt;

    public void refreshGoogleContent(MapPin source) {
        lat = source.lat;
        lng = source.lng;
        placeName = source.placeName;
        googleContentFetchedAt = source.googleContentFetchedAt;
    }

    @PrePersist
    void initializeGoogleContentFetchedAt() {
        if (googleContentFetchedAt == null) {
            googleContentFetchedAt = createdAt != null ? createdAt : LocalDateTime.now();
        }
    }
}
