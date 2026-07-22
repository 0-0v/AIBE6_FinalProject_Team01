package back.backend.domain.collaboration.activitylog.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import back.backend.domain.collaboration.activitylog.dto.ActivityLogCreateCommand;
import back.backend.domain.collaboration.activitylog.dto.ActivityLogResponse;
import back.backend.domain.collaboration.activitylog.entity.ActivityLog;
import back.backend.domain.collaboration.activitylog.exception.ActivityLogErrorCode;
import back.backend.domain.collaboration.activitylog.port.TripMemberAccessChecker;
import back.backend.domain.collaboration.activitylog.repository.ActivityLogRepository;
import back.backend.global.exception.BusinessException;
import back.backend.global.response.PageResponse;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class ActivityLogServiceTest {

    @Mock
    private ActivityLogRepository activityLogRepository;

    @Mock
    private TripMemberAccessChecker tripMemberAccessChecker;

    private ActivityLogService activityLogService;

    @BeforeEach
    void setUp() {
        activityLogService = new ActivityLogService(activityLogRepository, tripMemberAccessChecker);
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

    @Test
    @DisplayName("t2 여행 멤버가 활동 로그를 조회하면 페이지 응답을 반환한다")
    void t2_getActivityLogsReturnsPageWhenMemberHasAccess() {
        PageRequest pageable = PageRequest.of(0, 20);
        ActivityLog activityLog = createActivityLog();
        when(tripMemberAccessChecker.isMember(1L, 2L)).thenReturn(true);
        when(activityLogRepository.findAllByTripIdOrderByCreatedAtDescIdDesc(1L, pageable))
                .thenReturn(new PageImpl<>(List.of(activityLog), pageable, 1));

        PageResponse<ActivityLogResponse> response = activityLogService.getActivityLogs(1L, 2L, pageable);

        assertThat(response.content()).hasSize(1);
        assertThat(response.content().getFirst().actionType()).isEqualTo("PLACE_ADDED");
        assertThat(response.content().getFirst().metadata()).containsEntry("placeName", "자매국수");
    }

    @Test
    @DisplayName("t3 여행 멤버가 아닌 회원이 활동 로그를 조회하면 접근 거부 예외가 발생한다")
    void t3_getActivityLogsThrowsWhenMemberHasNoAccess() {
        PageRequest pageable = PageRequest.of(0, 20);
        when(tripMemberAccessChecker.isMember(1L, 3L)).thenReturn(false);

        assertThatThrownBy(() -> activityLogService.getActivityLogs(1L, 3L, pageable))
                .isInstanceOf(BusinessException.class)
                .satisfies(exception -> assertThat(((BusinessException) exception).getErrorCode())
                        .isEqualTo(ActivityLogErrorCode.TRIP_ACCESS_DENIED));
        verify(activityLogRepository, never())
                .findAllByTripIdOrderByCreatedAtDescIdDesc(1L, pageable);
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

    private ActivityLog createActivityLog() {
        ActivityLog activityLog = ActivityLog.create(
                1L,
                2L,
                null,
                "PLACE_ADDED",
                "TRIP_PLACE",
                20L,
                "후보 장소가 추가되었습니다.",
                Map.of("placeName", "자매국수")
        );
        ReflectionTestUtils.setField(activityLog, "id", 10L);
        ReflectionTestUtils.setField(activityLog, "createdAt", LocalDateTime.of(2026, 7, 22, 16, 0));
        return activityLog;
    }
}
