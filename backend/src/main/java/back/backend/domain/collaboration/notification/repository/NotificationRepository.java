package back.backend.domain.collaboration.notification.repository;

import back.backend.domain.collaboration.notification.entity.Notification;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    Page<Notification> findAllByMemberIdOrderByCreatedAtDescIdDesc(Long memberId, Pageable pageable);

    long countByMemberIdAndReadFalse(Long memberId);

    Optional<Notification> findByIdAndMemberId(Long notificationId, Long memberId);
}
