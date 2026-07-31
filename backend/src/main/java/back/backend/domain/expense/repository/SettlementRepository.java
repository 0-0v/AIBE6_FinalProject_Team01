package back.backend.domain.expense.repository;

import back.backend.domain.expense.entity.Settlement;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SettlementRepository extends JpaRepository<Settlement, Long> {
    List<Settlement> findAllByTripId(Long tripId);

    Optional<Settlement> findTopByTripIdAndSenderIdAndReceiverIdOrderByUpdatedAtDesc(
            Long tripId, Long senderId, Long receiverId);
}
