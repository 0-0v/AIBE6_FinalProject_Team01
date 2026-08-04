package back.backend.domain.collaboration.activitylog.repository;

import static org.assertj.core.api.Assertions.assertThat;

import back.backend.domain.collaboration.activitylog.entity.ActivityLog;
import back.backend.global.config.JpaConfig;
import java.util.LinkedHashMap;
import java.util.Map;
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
class ActivityLogRepositoryTest {

    @Autowired
    private ActivityLogRepository activityLogRepository;

    @Test
    @DisplayName("t1 여행의 활동 로그를 최신 생성 순서로 조회한다")
    void t1_findAllByTripIdReturnsActivityLogsInLatestOrder() {
        ActivityLog first = saveActivityLog(1L, "PLACE_ADDED", 10L);
        ActivityLog second = saveActivityLog(1L, "VOTE_CREATED", 11L);
        saveActivityLog(2L, "PLACE_ADDED", 12L);

        Page<ActivityLog> result = activityLogRepository.findAllByTripIdOrderByCreatedAtDescIdDesc(
                1L,
                PageRequest.of(0, 10)
        );

        assertThat(result.getContent()).extracting(ActivityLog::getId)
                .containsExactly(second.getId(), first.getId());
    }

    @Test
    @DisplayName("t2 활동 로그를 저장하면 메타데이터와 생성 시각을 보존한다")
    void t2_savePersistsMetadataAndCreatedAt() {
        ActivityLog saved = saveActivityLog(1L, "PLACE_ADDED", 10L);

        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getMetadata()).containsEntry("placeName", "자매국수");
        assertThat(saved.getCreatedAt()).isNotNull();
    }

    @Test
    @DisplayName("t3 활동 로그 메타데이터에 null 값이 있어도 저장하고 조회한다")
    void t3_savePersistsMetadataContainingNullValue() {
        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("beforeValue", null);
        ActivityLog activityLog = ActivityLog.create(
                1L,
                1L,
                "PLACE_UPDATED",
                "TRIP_PLACE",
                10L,
                "후보 장소가 수정되었습니다.",
                metadata
        );

        ActivityLog saved = activityLogRepository.saveAndFlush(activityLog);

        assertThat(saved.getMetadata()).containsEntry("beforeValue", null);
    }

    private ActivityLog saveActivityLog(Long tripId, String actionType, Long targetId) {
        return activityLogRepository.saveAndFlush(ActivityLog.create(
                tripId,
                1L,
                actionType,
                "TRIP_PLACE",
                targetId,
                "후보 장소가 추가되었습니다.",
                Map.of("placeName", "자매국수")
        ));
    }
}
