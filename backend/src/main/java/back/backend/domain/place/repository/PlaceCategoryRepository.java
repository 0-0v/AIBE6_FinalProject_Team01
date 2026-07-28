package back.backend.domain.place.repository;

import back.backend.domain.place.entity.PlaceCategory;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PlaceCategoryRepository extends JpaRepository<PlaceCategory, Long> {

    List<PlaceCategory> findAllByTripIdOrderBySortOrderAscIdAsc(Long tripId);

    Optional<PlaceCategory> findByIdAndTripId(Long id, Long tripId);

    @Modifying
    @Query(value = """
            INSERT IGNORE INTO categories
                (trip_id, name, category_type, marker_color, marker_icon, sort_order)
            VALUES
                (:tripId, :name, :categoryType, :markerColor, :markerIcon, :sortOrder)
            """, nativeQuery = true)
    void insertIgnore(
            @Param("tripId") Long tripId,
            @Param("name") String name,
            @Param("categoryType") String categoryType,
            @Param("markerColor") String markerColor,
            @Param("markerIcon") String markerIcon,
            @Param("sortOrder") int sortOrder
    );
}
