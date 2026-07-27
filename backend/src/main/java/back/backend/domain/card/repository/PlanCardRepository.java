package back.backend.domain.card.repository;
import back.backend.domain.card.entity.PlanCard;
import java.util.Optional;
import java.util.List;
import back.backend.domain.trip.entity.TripVisibility;
import org.springframework.data.jpa.repository.JpaRepository;
public interface PlanCardRepository extends JpaRepository<PlanCard, Long> {
    boolean existsByTripId(Long tripId);
    Optional<PlanCard> findByTripId(Long tripId);
    List<PlanCard> findAllByVisibility(TripVisibility visibility);
}
