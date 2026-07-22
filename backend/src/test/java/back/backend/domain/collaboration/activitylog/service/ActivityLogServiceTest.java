package back.backend.domain.collaboration.activitylog.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import back.backend.domain.collaboration.activitylog.dto.ActivityLogCreateCommand;
import back.backend.domain.collaboration.activitylog.entity.ActivityLog;
import back.backend.domain.collaboration.activitylog.repository.ActivityLogRepository;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class ActivityLogServiceTest {

    @Mock
    private ActivityLogRepository activityLogRepository;

    private ActivityLogService activityLogService;

    @BeforeEach
    void setUp() {
        activityLogService = new ActivityLogService(activityLogRepository);
    }

    @Test
    @DisplayName("t1 활동 로그를 생성하면 저장된 활동 로그 식별자를 반환한다")
    void t1_createReturnsSavedActivityLogId() {
        ActivityLogCreateCommand command = createCommand();
        when(activityLogRepository.save(any(ActivityLog.class))).thenAnswer(invocation -> {
            ActivityLog activityLog = invocation.getArgument(0);
            ReflectionTestUtils.setField(activityLog, "id", 10L);
            return activityLog;
        });

        Long activityLogId = activityLogService.create(command);

        assertThat(activityLogId).isEqualTo(10L);
    }

    private ActivityLogCreateCommand createCommand() {
        return new ActivityLogCreateCommand(
                1L,
                2L,
                null,
                "PLACE_ADDED",
                "TRIP_PLACE",
                20L,
                "후보 장소가 추가되었습니다.",
                Map.of("placeName", "자매국수")
        );
    }
}
