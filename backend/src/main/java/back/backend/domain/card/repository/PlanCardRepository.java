package back.backend.domain.card.repository;
import back.backend.domain.card.entity.PlanCard;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
public interface PlanCardRepository extends JpaRepository<PlanCard, Long> {
    boolean existsByTripId(Long tripId);
    Optional<PlanCard> findByTripId(Long tripId);
}
