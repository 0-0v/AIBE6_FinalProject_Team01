package back.backend.domain.place.repository;

import back.backend.domain.place.entity.TripPlace;
import back.backend.domain.place.entity.TripPlaceStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface TripPlaceRepository extends JpaRepository<TripPlace, Long> {
    @Query("""
            SELECT tp FROM TripPlace tp
            JOIN FETCH tp.place
            WHERE tp.tripId = :tripId
            ORDER BY CASE WHEN tp.priority IS NULL THEN 1 ELSE 0 END,
                     tp.priority ASC, tp.id ASC
            """)
    List<TripPlace> findAllOrderedByTripId(@Param("tripId") Long tripId);

    @Query("""
            SELECT tp FROM TripPlace tp
            JOIN FETCH tp.place
            WHERE tp.tripId = :tripId AND tp.status = :status
            ORDER BY CASE WHEN tp.priority IS NULL THEN 1 ELSE 0 END,
                     tp.priority ASC, tp.id ASC
            """)
    List<TripPlace> findAllOrderedByTripIdAndStatus(
            @Param("tripId") Long tripId,
            @Param("status") TripPlaceStatus status
    );
    boolean existsByTripIdAndPlaceId(Long tripId, Long placeId);
    Optional<TripPlace> findByIdAndTripId(Long id, Long tripId);
}
