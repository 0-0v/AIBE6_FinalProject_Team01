package back.backend.domain.place.repository;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class PlaceCategoryInitializationLockRepository {

    private static final String LOCK_TRIP_QUERY = """
            SELECT id
            FROM trips
            WHERE id = :tripId
            FOR UPDATE
            """;

    private final JdbcClient jdbcClient;

    public PlaceCategoryInitializationLockRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    public void lockTrip(Long tripId) {
        jdbcClient.sql(LOCK_TRIP_QUERY)
                .param("tripId", tripId)
                .query(Long.class)
                .single();
    }
}
