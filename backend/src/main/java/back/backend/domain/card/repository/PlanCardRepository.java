package back.backend.domain.card.repository;
import back.backend.domain.card.entity.PlanCard;
import org.springframework.data.jpa.repository.JpaRepository;
public interface PlanCardRepository extends JpaRepository<PlanCard, Long> { boolean existsByTripId(Long tripId); }
