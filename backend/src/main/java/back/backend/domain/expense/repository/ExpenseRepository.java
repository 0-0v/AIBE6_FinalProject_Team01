package back.backend.domain.expense.repository;

import back.backend.domain.expense.entity.Expense;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ExpenseRepository extends JpaRepository<Expense, Long> {
    List<Expense> findAllByTripIdOrderByExpenseDateAscCreatedAtAscIdAsc(Long tripId);
}
