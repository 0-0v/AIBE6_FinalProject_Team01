package back.backend.domain.place.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "categories")
@Getter
@Builder
@AllArgsConstructor
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PlaceCategory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "trip_id", nullable = false)
    private Long tripId;

    @Column(nullable = false, length = 50)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "category_type", nullable = false, length = 30)
    private PlaceCategoryType categoryType;

    @Column(name = "marker_color", nullable = false, length = 20)
    private String markerColor;

    @Column(name = "marker_icon", nullable = false, length = 50)
    @Enumerated(EnumType.STRING)
    private PlaceMarkerIcon markerIcon;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    public void update(String name, String markerColor, PlaceMarkerIcon markerIcon) {
        this.name = name;
        this.markerColor = markerColor;
        this.markerIcon = markerIcon;
    }

    public void updateSortOrder(int sortOrder) {
        this.sortOrder = sortOrder;
    }
}
