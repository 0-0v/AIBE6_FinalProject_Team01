package back.backend.domain.collaboration.activitylog.repository;

import back.backend.domain.collaboration.activitylog.entity.ActivityLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ActivityLogRepository extends JpaRepository<ActivityLog, Long> {

    Page<ActivityLog> findAllByTripIdOrderByCreatedAtDescIdDesc(Long tripId, Pageable pageable);
}
