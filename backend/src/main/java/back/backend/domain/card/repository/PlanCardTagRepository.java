package back.backend.domain.card.repository;
import back.backend.domain.card.entity.PlanCardTag;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface PlanCardTagRepository extends JpaRepository<PlanCardTag, Long> {
    boolean existsByPlanCardIdAndTagId(Long planCardId, Long tagId);
    List<PlanCardTag> findAllByPlanCardId(Long planCardId);
}
