package back.backend.domain.card.repository;

import back.backend.domain.card.entity.TripCardBookmarkShare;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TripCardBookmarkShareRepository extends JpaRepository<TripCardBookmarkShare, Long> {
    boolean existsByTripIdAndPlanCardIdAndMemberId(Long tripId, Long planCardId, Long memberId);
    void deleteByTripIdAndPlanCardIdAndMemberId(Long tripId, Long planCardId, Long memberId);
    void deleteAllByPlanCardIdAndMemberId(Long planCardId, Long memberId);
    @Query(
            value = """
                    select share.planCardId
                    from TripCardBookmarkShare share
                    where share.tripId = :tripId
                    group by share.planCardId
                    order by max(share.sharedAt) desc, share.planCardId desc
                    """,
            countQuery = """
                    select count(distinct share.planCardId)
                    from TripCardBookmarkShare share
                    where share.tripId = :tripId
                    """)
    Page<Long> findDistinctPlanCardIdsByTripId(
            @Param("tripId") Long tripId,
            Pageable pageable
    );

    List<TripCardBookmarkShare> findAllByTripIdAndPlanCardIdIn(
            Long tripId,
            List<Long> planCardIds
    );
}
