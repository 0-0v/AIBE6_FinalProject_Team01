package back.backend.domain.itinerary.repository;

import back.backend.domain.itinerary.entity.ItineraryDay;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ItineraryDayRepository extends JpaRepository<ItineraryDay, Long> {

    @Query("SELECT DISTINCT d FROM ItineraryDay d LEFT JOIN FETCH d.items WHERE d.tripId = :tripId ORDER BY d.dayNumber ASC")
    List<ItineraryDay> findAllWithItemsByTripId(@Param("tripId") Long tripId);

    Optional<ItineraryDay> findByIdAndTripId(Long id, Long tripId);

    List<ItineraryDay> findAllByTripIdOrderByItineraryDateAsc(Long tripId);
}
