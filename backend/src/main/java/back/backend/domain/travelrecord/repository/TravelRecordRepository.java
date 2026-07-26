package back.backend.domain.travelrecord.repository;

import back.backend.domain.travelrecord.entity.TravelRecord;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TravelRecordRepository extends JpaRepository<TravelRecord, Long> {
    List<TravelRecord> findAllByTripIdOrderByVisitedAtDescIdDesc(Long tripId);
}
