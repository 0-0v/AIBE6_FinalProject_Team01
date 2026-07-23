package back.backend.domain.place.repository;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.jdbc.test.autoconfigure.JdbcTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.jdbc.Sql;

@JdbcTest
@ActiveProfiles("test")
@Import(PlaceVoteNotificationRepository.class)
@Sql(statements = {
        "CREATE TABLE IF NOT EXISTS trips (id BIGINT PRIMARY KEY, owner_id BIGINT NOT NULL)",
        "CREATE TABLE IF NOT EXISTS trip_members (id BIGINT AUTO_INCREMENT PRIMARY KEY, trip_id BIGINT NOT NULL, member_id BIGINT NOT NULL, role VARCHAR(20) NOT NULL)",
        "CREATE TABLE IF NOT EXISTS notifications (id BIGINT AUTO_INCREMENT PRIMARY KEY, member_id BIGINT NOT NULL, trip_id BIGINT, notification_type VARCHAR(30) NOT NULL, content VARCHAR(500) NOT NULL, target_type VARCHAR(30), target_id BIGINT, is_read BOOLEAN NOT NULL, created_at TIMESTAMP NOT NULL)"
})
class PlaceVoteNotificationRepositoryTest {

    @Autowired private PlaceVoteNotificationRepository repository;
    @Autowired private JdbcClient jdbcClient;

    @BeforeEach
    void setUp() {
        jdbcClient.sql("DELETE FROM notifications").update();
        jdbcClient.sql("DELETE FROM trip_members").update();
        jdbcClient.sql("DELETE FROM trips").update();
        jdbcClient.sql("INSERT INTO trips (id, owner_id) VALUES (100, 1)").update();
        jdbcClient.sql("INSERT INTO trip_members (trip_id, member_id, role) VALUES (100, 2, 'EDITOR')").update();
        jdbcClient.sql("INSERT INTO trip_members (trip_id, member_id, role) VALUES (100, 3, 'VIEWER')").update();
    }

    @Test
    @DisplayName("t1 여행 소유자와 모든 멤버 ID를 중복 없이 조회한다")
    void t1_findAllTripMemberIds() {
        assertThat(repository.findTripMemberIds(100L))
                .containsExactlyInAnyOrderElementsOf(List.of(1L, 2L, 3L));
    }

    @Test
    @DisplayName("t2 투표 신청자를 제외한 여행 멤버들에게 알림을 저장한다")
    void t2_notifyMembersExceptRequester() {
        repository.notifyVoteRequested(100L, 10L, 2L, "성산일출봉", List.of(1L, 2L, 3L));

        List<Long> notifiedMemberIds = jdbcClient.sql("""
                        SELECT member_id FROM notifications
                        WHERE trip_id = 100 AND notification_type = 'PLACE_VOTE_REQUESTED'
                        """)
                .query(Long.class)
                .list();
        assertThat(notifiedMemberIds).containsExactlyInAnyOrder(1L, 3L);
    }

    @Test
    @DisplayName("t3 로그인 회원의 장소 투표 알림을 최신순으로 조회한다")
    void t3_findNotificationsForMember() {
        repository.notifyVoteRequested(100L, 10L, 2L, "성산일출봉", List.of(1L, 2L, 3L));

        assertThat(repository.findNotifications(1L))
                .singleElement()
                .satisfies(notification -> {
                    assertThat(notification.tripId()).isEqualTo(100L);
                    assertThat(notification.tripPlaceId()).isEqualTo(10L);
                    assertThat(notification.read()).isFalse();
                });
    }

    @Test
    @DisplayName("t4 본인의 장소 투표 알림을 읽음 처리한다")
    void t4_markOwnNotificationRead() {
        repository.notifyVoteRequested(100L, 10L, 2L, "성산일출봉", List.of(1L, 2L, 3L));
        Long notificationId = repository.findNotifications(1L).getFirst().notificationId();

        assertThat(repository.markRead(notificationId, 1L)).isTrue();
        assertThat(repository.findNotifications(1L).getFirst().read()).isTrue();
    }
}
