package back.backend.domain.card.repository;

import back.backend.domain.card.entity.TripCardBookmarkShare;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TripCardBookmarkShareRepository extends JpaRepository<TripCardBookmarkShare, Long> {
    boolean existsByTripIdAndPlanCardIdAndMemberId(Long tripId, Long planCardId, Long memberId);
    void deleteByTripIdAndPlanCardIdAndMemberId(Long tripId, Long planCardId, Long memberId);
    void deleteAllByPlanCardIdAndMemberId(Long planCardId, Long memberId);
    List<TripCardBookmarkShare> findAllByTripIdOrderBySharedAtDesc(Long tripId);
}
