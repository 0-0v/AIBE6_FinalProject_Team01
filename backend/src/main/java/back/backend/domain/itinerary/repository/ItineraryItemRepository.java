package back.backend.domain.itinerary.repository;

import back.backend.domain.itinerary.entity.ItineraryDay;
import back.backend.domain.itinerary.entity.ItineraryItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.List;

public interface ItineraryItemRepository extends JpaRepository<ItineraryItem, Long> {

    @Query("SELECT i FROM ItineraryItem i JOIN i.itineraryDay d WHERE i.id = :itemId AND d.tripId = :tripId")
    Optional<ItineraryItem> findByIdAndTripId(@Param("itemId") Long itemId, @Param("tripId") Long tripId);

    @Query("""
            SELECT CASE WHEN COUNT(i) > 0 THEN true ELSE false END
            FROM ItineraryItem i
            JOIN i.itineraryDay d
            WHERE d.tripId = :tripId AND i.tripPlaceId = :tripPlaceId
            """)
    boolean existsByItineraryDayTripIdAndTripPlaceId(
            @Param("tripId") Long tripId,
            @Param("tripPlaceId") Long tripPlaceId
    );

    boolean existsByItineraryDayAndTripPlaceIdAndIdNot(
            ItineraryDay itineraryDay,
            Long tripPlaceId,
            Long id
    );

    boolean existsByItineraryDayAndSortOrder(ItineraryDay itineraryDay, int sortOrder);

    boolean existsByItineraryDayAndSortOrderAndIdNot(
            ItineraryDay itineraryDay,
            int sortOrder,
            Long id
    );

    List<ItineraryItem> findAllByItineraryDayOrderBySortOrderAsc(ItineraryDay itineraryDay);
}
