package back.backend.domain.card.repository;

import back.backend.domain.card.entity.CardComment;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface CardCommentRepository extends JpaRepository<CardComment, Long> {
    List<CardComment> findAllByPlanCardIdOrderByCreatedAtAsc(Long planCardId);
    Page<CardComment> findAllByPlanCardIdOrderByCreatedAtAsc(Long planCardId, Pageable pageable);
    Optional<CardComment> findByIdAndMemberId(Long id, Long memberId);
    long countByPlanCardId(Long planCardId);

    @Query("select comment.planCardId as planCardId, count(comment.id) as total "
            + "from CardComment comment where comment.planCardId in :planCardIds "
            + "group by comment.planCardId")
    List<CardCount> countAllByPlanCardIds(List<Long> planCardIds);

    interface CardCount {
        Long getPlanCardId();
        long getTotal();
    }
}
