package back.backend.domain.expense.repository;

import back.backend.domain.expense.entity.ExpenseParticipant;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ExpenseParticipantRepository extends JpaRepository<ExpenseParticipant, Long> {
    List<ExpenseParticipant> findAllByExpenseIdIn(List<Long> expenseIds);
    List<ExpenseParticipant> findAllByExpenseId(Long expenseId);
    Optional<ExpenseParticipant> findByExpenseIdAndMemberId(Long expenseId, Long memberId);
    void deleteAllByExpenseId(Long expenseId);
}
