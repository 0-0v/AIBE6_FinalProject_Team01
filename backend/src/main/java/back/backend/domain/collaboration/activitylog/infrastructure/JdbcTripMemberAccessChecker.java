package back.backend.domain.collaboration.activitylog.infrastructure;

import back.backend.domain.collaboration.activitylog.port.TripMemberAccessChecker;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class JdbcTripMemberAccessChecker implements TripMemberAccessChecker {

    private final JdbcClient jdbcClient;

    public JdbcTripMemberAccessChecker(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    @Override
    public boolean isMember(Long tripId, Long memberId) {
        return jdbcClient.sql("""
                        select exists(
                            select 1
                            from trip_members
                            where trip_id = :tripId and member_id = :memberId
                            union all
                            select 1
                            from trips
                            where id = :tripId and owner_id = :memberId
                        )
                        """)
                .param("tripId", tripId)
                .param("memberId", memberId)
                .query(Boolean.class)
                .single();
    }
}
