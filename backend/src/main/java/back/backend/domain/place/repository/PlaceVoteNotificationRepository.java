package back.backend.domain.place.repository;

import back.backend.domain.place.dto.response.PlaceVoteNotificationResponse;
import java.time.format.DateTimeFormatter;
import java.util.List;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class PlaceVoteNotificationRepository {

    private static final String TRIP_MEMBER_IDS_QUERY = """
            SELECT t.owner_id AS member_id
            FROM trips t
            WHERE t.id = :tripId
            UNION
            SELECT tm.member_id
            FROM trip_members tm
            WHERE tm.trip_id = :tripId
            """;

    private static final String INSERT_NOTIFICATION = """
            INSERT INTO notifications (
                member_id, trip_id, notification_type, content,
                target_type, target_id, is_read, created_at
            ) VALUES (
                :memberId, :tripId, 'PLACE_VOTE_REQUESTED', :content,
                'TRIP_PLACE', :tripPlaceId, false, CURRENT_TIMESTAMP
            )
            """;

    private static final String FIND_NOTIFICATIONS = """
            SELECT id, trip_id, target_id, content, is_read, created_at
            FROM notifications
            WHERE member_id = :memberId
              AND notification_type = 'PLACE_VOTE_REQUESTED'
            ORDER BY created_at DESC, id DESC
            LIMIT 50
            """;

    private static final String MARK_READ = """
            UPDATE notifications
            SET is_read = true
            WHERE id = :notificationId
              AND member_id = :memberId
              AND notification_type = 'PLACE_VOTE_REQUESTED'
            """;

    private final JdbcClient jdbcClient;

    public PlaceVoteNotificationRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    public List<Long> findTripMemberIds(Long tripId) {
        return jdbcClient.sql(TRIP_MEMBER_IDS_QUERY)
                .param("tripId", tripId)
                .query(Long.class)
                .list();
    }

    public void notifyVoteRequested(Long tripId, Long tripPlaceId, Long requesterId, String placeName, List<Long> memberIds) {
        String content = placeName + " 갈래말래 투표가 시작됐습니다.";
        memberIds.stream()
                .filter(memberId -> !memberId.equals(requesterId))
                .forEach(memberId -> jdbcClient.sql(INSERT_NOTIFICATION)
                        .param("memberId", memberId)
                        .param("tripId", tripId)
                        .param("content", content)
                        .param("tripPlaceId", tripPlaceId)
                        .update());
    }

    public List<PlaceVoteNotificationResponse> findNotifications(Long memberId) {
        return jdbcClient.sql(FIND_NOTIFICATIONS)
                .param("memberId", memberId)
                .query((resultSet, rowNumber) -> new PlaceVoteNotificationResponse(
                        resultSet.getLong("id"),
                        resultSet.getLong("trip_id"),
                        resultSet.getLong("target_id"),
                        resultSet.getString("content"),
                        resultSet.getBoolean("is_read"),
                        resultSet.getTimestamp("created_at").toLocalDateTime()
                                .format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
                ))
                .list();
    }

    public boolean markRead(Long notificationId, Long memberId) {
        return jdbcClient.sql(MARK_READ)
                .param("notificationId", notificationId)
                .param("memberId", memberId)
                .update() > 0;
    }
}
