package back.backend.domain.expense.repository;

import back.backend.domain.expense.entity.ExpenseParticipant;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ExpenseParticipantRepository extends JpaRepository<ExpenseParticipant, Long> {
    List<ExpenseParticipant> findAllByExpenseIdIn(List<Long> expenseIds);
}
