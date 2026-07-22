package back.backend.domain.collaboration.notification.repository;

import static org.assertj.core.api.Assertions.assertThat;

import back.backend.domain.collaboration.notification.entity.Notification;
import back.backend.domain.collaboration.notification.entity.NotificationType;
import back.backend.global.config.JpaConfig;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

@DataJpaTest
@ActiveProfiles("test")
@Import(JpaConfig.class)
@TestPropertySource(properties = "spring.jpa.hibernate.ddl-auto=create-drop")
class NotificationRepositoryTest {

    @Autowired
    private NotificationRepository notificationRepository;

    @Test
    @DisplayName("t1 회원의 알림을 최신 생성 순서로 조회한다")
    void t1_findAllByMemberIdReturnsNotificationsInLatestOrder() {
        Notification first = saveNotification(1L, "첫 번째 알림");
        Notification second = saveNotification(1L, "두 번째 알림");
        saveNotification(2L, "다른 회원 알림");

        Page<Notification> result = notificationRepository.findAllByMemberIdOrderByCreatedAtDescIdDesc(
                1L,
                PageRequest.of(0, 10)
        );

        assertThat(result.getContent()).extracting(Notification::getId)
                .containsExactly(second.getId(), first.getId());
    }

    @Test
    @DisplayName("t2 회원이 읽지 않은 알림 개수를 조회한다")
    void t2_countByMemberIdAndReadFalseReturnsUnreadCount() {
        saveNotification(1L, "읽지 않은 알림 1");
        saveNotification(1L, "읽지 않은 알림 2");
        saveNotification(2L, "다른 회원 알림");

        long count = notificationRepository.countByMemberIdAndReadFalse(1L);

        assertThat(count).isEqualTo(2L);
    }

    @Test
    @DisplayName("t3 알림 식별자와 회원 식별자가 모두 일치할 때 알림을 조회한다")
    void t3_findByIdAndMemberIdReturnsOnlyOwnedNotification() {
        Notification notification = saveNotification(1L, "내 알림");

        Optional<Notification> owned = notificationRepository.findByIdAndMemberId(notification.getId(), 1L);
        Optional<Notification> notOwned = notificationRepository.findByIdAndMemberId(notification.getId(), 2L);

        assertThat(owned).contains(notification);
        assertThat(notOwned).isEmpty();
    }

    private Notification saveNotification(Long memberId, String content) {
        return notificationRepository.saveAndFlush(Notification.create(
                memberId,
                1L,
                NotificationType.VOTE,
                "투표 알림",
                content,
                "TRIP_PLACE",
                10L
        ));
    }
}
