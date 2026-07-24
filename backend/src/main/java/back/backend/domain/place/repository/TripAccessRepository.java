package back.backend.domain.place.repository;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class TripAccessRepository {

    // TODO: Trip 도메인 구현 시 여행 멤버 권한 정책과 함께 domain.trip 패키지로 이동한다.

    private static final String VIEW_ACCESS_QUERY = """
            SELECT COUNT(*)
            FROM trips t
            LEFT JOIN trip_members tm
              ON tm.trip_id = t.id AND tm.member_id = :memberId
            WHERE t.id = :tripId
              AND (t.owner_id = :memberId OR tm.member_id = :memberId)
            """;

    private final JdbcClient jdbcClient;

    public TripAccessRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    public boolean canView(Long tripId, Long memberId) {
        return count(VIEW_ACCESS_QUERY, tripId, memberId) > 0;
    }

    public boolean canEdit(Long tripId, Long memberId) {
        // 여행방에 초대된 모든 멤버는 동일하게 계획을 편집한다.
        return count(VIEW_ACCESS_QUERY, tripId, memberId) > 0;
    }

    private long count(String query, Long tripId, Long memberId) {
        return jdbcClient.sql(query)
                .param("tripId", tripId)
                .param("memberId", memberId)
                .query(Long.class)
                .single();
    }
}
