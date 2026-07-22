package back.backend.domain.collaboration.notification.repository;

import back.backend.domain.collaboration.notification.entity.Notification;
import java.util.Optional;
import java.time.LocalDateTime;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    Page<Notification> findAllByMemberIdOrderByCreatedAtDescIdDesc(Long memberId, Pageable pageable);

    long countByMemberIdAndReadFalse(Long memberId);

    Optional<Notification> findByIdAndMemberId(Long notificationId, Long memberId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            update Notification notification
            set notification.read = true, notification.readAt = :readAt
            where notification.memberId = :memberId and notification.read = false
            """)
    int markAllAsReadByMemberId(
            @Param("memberId") Long memberId,
            @Param("readAt") LocalDateTime readAt
    );
}
