package back.backend.domain.admin.repository;

import back.backend.domain.admin.entity.ExternalApiUsage;
import java.time.LocalDateTime;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ExternalApiUsageRepository extends JpaRepository<ExternalApiUsage, Long> {
    Page<ExternalApiUsage> findAllByMemberIdOrderByCreatedAtDescIdDesc(Long memberId, Pageable pageable);
    long countByCreatedAtGreaterThanEqual(LocalDateTime from);
}
