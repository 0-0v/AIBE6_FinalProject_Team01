package back.backend.domain.place.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Entity
@Table(name = "place_graph_edges")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PlaceGraphEdge {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "from_place_id", nullable = false)
    private Place fromPlace;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "to_place_id", nullable = false)
    private Place toPlace;

    @Column(name = "transport_type", nullable = false, length = 30)
    private String transportType;

    @Column(name = "distance_meters", nullable = false)
    private int distanceMeters;

    @Column(name = "travel_minutes", nullable = false)
    private int travelMinutes;

    @Column(nullable = false, length = 30)
    private String source;

    @Column(name = "cached_at", nullable = false)
    private Instant cachedAt;

    @Column(name = "expires_at")
    private Instant expiresAt;

    public static PlaceGraphEdge create(
            Place fromPlace,
            Place toPlace,
            String transportType,
            int distanceMeters,
            int travelMinutes,
            String source,
            Instant cachedAt,
            Instant expiresAt
    ) {
        PlaceGraphEdge edge = new PlaceGraphEdge();
        edge.fromPlace = fromPlace;
        edge.toPlace = toPlace;
        edge.transportType = transportType;
        edge.refresh(distanceMeters, travelMinutes, source, cachedAt, expiresAt);
        return edge;
    }

    public void refresh(
            int distanceMeters,
            int travelMinutes,
            String source,
            Instant cachedAt,
            Instant expiresAt
    ) {
        this.distanceMeters = distanceMeters;
        this.travelMinutes = travelMinutes;
        this.source = source;
        this.cachedAt = cachedAt;
        this.expiresAt = expiresAt;
    }

    public boolean isValidAt(Instant instant) {
        return expiresAt == null || expiresAt.isAfter(instant);
    }
}
