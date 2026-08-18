package back.backend.domain.card.repository;

import back.backend.domain.card.entity.SavedTrip;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface SavedTripRepository extends JpaRepository<SavedTrip, Long> {
    Optional<SavedTrip> findByMemberIdAndTripId(Long memberId, Long tripId);
    List<SavedTrip> findAllByMemberIdOrderByIdDesc(Long memberId);
    long countByTripId(Long tripId);

    @Query("select saved.tripId as tripId, count(saved.id) as total "
            + "from SavedTrip saved where saved.tripId in :tripIds group by saved.tripId")
    List<TripCount> countAllByTripIds(List<Long> tripIds);

    interface TripCount {
        Long getTripId();
        long getTotal();
    }
}
