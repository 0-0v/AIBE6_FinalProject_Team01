package back.backend.domain.card.repository;

import back.backend.domain.card.entity.CardComment;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CardCommentRepository extends JpaRepository<CardComment, Long> {
    List<CardComment> findAllByPlanCardIdOrderByCreatedAtAsc(Long planCardId);
    Optional<CardComment> findByIdAndMemberId(Long id, Long memberId);
    long countByPlanCardId(Long planCardId);
}
