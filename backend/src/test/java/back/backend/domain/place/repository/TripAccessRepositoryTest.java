package back.backend.domain.place.repository;

import static org.assertj.core.api.Assertions.assertThat;

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
@Import(TripAccessRepository.class)
@Sql(statements = {
        "CREATE TABLE IF NOT EXISTS trips (id BIGINT PRIMARY KEY, owner_id BIGINT NOT NULL)",
        "CREATE TABLE IF NOT EXISTS trip_members (id BIGINT AUTO_INCREMENT PRIMARY KEY, trip_id BIGINT NOT NULL, member_id BIGINT NOT NULL, role VARCHAR(20) NOT NULL)"
})
class TripAccessRepositoryTest {

    @Autowired
    private TripAccessRepository tripAccessRepository;

    @Autowired
    private JdbcClient jdbcClient;

    @BeforeEach
    void setUp() {
        jdbcClient.sql("DELETE FROM trip_members").update();
        jdbcClient.sql("DELETE FROM trips").update();
        jdbcClient.sql("INSERT INTO trips (id, owner_id) VALUES (100, 1)").update();
        jdbcClient.sql("INSERT INTO trip_members (trip_id, member_id, role) VALUES (100, 2, 'EDITOR')").update();
        jdbcClient.sql("INSERT INTO trip_members (trip_id, member_id, role) VALUES (100, 3, 'VIEWER')").update();
    }

    @Test
    @DisplayName("t1 여행 소유자는 조회·편집 권한을 모두 가진다")
    void t1_ownerCanViewAndEdit() {
        assertThat(tripAccessRepository.canView(100L, 1L)).isTrue();
        assertThat(tripAccessRepository.canEdit(100L, 1L)).isTrue();
    }

    @Test
    @DisplayName("t2 EDITOR 역할 멤버는 조회·편집 권한을 모두 가진다")
    void t2_editorCanViewAndEdit() {
        assertThat(tripAccessRepository.canView(100L, 2L)).isTrue();
        assertThat(tripAccessRepository.canEdit(100L, 2L)).isTrue();
    }

    @Test
    @DisplayName("t3 VIEWER 역할 멤버는 조회 권한만 가지고 편집 권한은 없다")
    void t3_viewerCanViewButNotEdit() {
        assertThat(tripAccessRepository.canView(100L, 3L)).isTrue();
        assertThat(tripAccessRepository.canEdit(100L, 3L)).isFalse();
    }

    @Test
    @DisplayName("t4 여행 멤버가 아닌 회원은 조회·편집 권한이 모두 없다")
    void t4_nonMemberCannotViewOrEdit() {
        assertThat(tripAccessRepository.canView(100L, 4L)).isFalse();
        assertThat(tripAccessRepository.canEdit(100L, 4L)).isFalse();
    }
}
