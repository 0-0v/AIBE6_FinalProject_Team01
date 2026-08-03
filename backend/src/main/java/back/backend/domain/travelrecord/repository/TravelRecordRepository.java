package back.backend.domain.travelrecord.repository;

import back.backend.domain.travelrecord.entity.TravelRecord;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TravelRecordRepository extends JpaRepository<TravelRecord, Long> {
    List<TravelRecord> findAllByTripIdOrderByVisitedAtDescIdDesc(Long tripId);
    boolean existsByTripIdAndPlaceId(Long tripId, Long placeId);
    Optional<TravelRecord> findByIdAndTripId(Long id, Long tripId);
}
