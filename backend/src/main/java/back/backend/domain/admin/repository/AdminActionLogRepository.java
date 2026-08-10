package back.backend.domain.admin.repository;

import back.backend.domain.admin.entity.AdminActionLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AdminActionLogRepository extends JpaRepository<AdminActionLog, Long> {
    Page<AdminActionLog> findAllByOrderByCreatedAtDescIdDesc(Pageable pageable);
    Page<AdminActionLog> findAllByTargetTypeAndTargetIdOrderByCreatedAtDescIdDesc(
            String targetType, Long targetId, Pageable pageable);
}
