package back.backend.domain.card.repository;

import back.backend.domain.card.entity.SavedTrip;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SavedTripRepository extends JpaRepository<SavedTrip, Long> {
    Optional<SavedTrip> findByMemberIdAndTripId(Long memberId, Long tripId);
    List<SavedTrip> findAllByMemberIdOrderByIdDesc(Long memberId);
    long countByTripId(Long tripId);
}
