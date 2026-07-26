package back.backend.domain.place.repository;

import back.backend.domain.place.entity.TripPlace;
import back.backend.domain.place.entity.TripPlaceStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface TripPlaceRepository extends JpaRepository<TripPlace, Long> {
    @Query("""
            SELECT tp FROM TripPlace tp
            JOIN FETCH tp.place
            WHERE tp.tripId = :tripId
            ORDER BY tp.id ASC
            """)
    List<TripPlace> findAllOrderedByTripId(@Param("tripId") Long tripId);

    @Query("""
            SELECT tp FROM TripPlace tp
            JOIN FETCH tp.place
            WHERE tp.tripId = :tripId AND tp.status = :status
            ORDER BY tp.id ASC
            """)
    List<TripPlace> findAllOrderedByTripIdAndStatus(
            @Param("tripId") Long tripId,
            @Param("status") TripPlaceStatus status
    );
    Optional<TripPlace> findByTripIdAndPlaceId(Long tripId, Long placeId);
    Optional<TripPlace> findByIdAndTripId(Long id, Long tripId);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT tp FROM TripPlace tp JOIN FETCH tp.place WHERE tp.id = :id AND tp.tripId = :tripId")
    Optional<TripPlace> findByIdAndTripIdForUpdate(
            @Param("id") Long id,
            @Param("tripId") Long tripId
    );

}
