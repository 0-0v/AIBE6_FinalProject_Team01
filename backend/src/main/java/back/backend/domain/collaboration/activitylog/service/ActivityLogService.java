package back.backend.domain.collaboration.activitylog.service;

import back.backend.domain.collaboration.activitylog.dto.ActivityLogCreateCommand;
import back.backend.domain.collaboration.activitylog.dto.ActivityLogResponse;
import back.backend.domain.collaboration.activitylog.entity.ActivityLog;
import back.backend.domain.collaboration.activitylog.exception.ActivityLogErrorCode;
import back.backend.domain.collaboration.activitylog.port.TripMemberAccessChecker;
import back.backend.domain.collaboration.activitylog.repository.ActivityLogRepository;
import back.backend.global.exception.BusinessException;
import back.backend.global.response.PageResponse;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class ActivityLogService {

    private final ActivityLogRepository activityLogRepository;
    private final TripMemberAccessChecker tripMemberAccessChecker;

    public ActivityLogService(
            ActivityLogRepository activityLogRepository,
            TripMemberAccessChecker tripMemberAccessChecker
    ) {
        this.activityLogRepository = activityLogRepository;
        this.tripMemberAccessChecker = tripMemberAccessChecker;
    }

    @Transactional
    public Long create(ActivityLogCreateCommand command) {
        ActivityLog activityLog = ActivityLog.create(
                command.tripId(),
                command.memberId(),
                command.agentRunId(),
                command.actionType(),
                command.targetType(),
                command.targetId(),
                command.description(),
                command.metadata()
        );
        return activityLogRepository.save(activityLog).getId();
    }

    public PageResponse<ActivityLogResponse> getActivityLogs(
            Long tripId,
            Long memberId,
            Pageable pageable
    ) {
        if (!tripMemberAccessChecker.isMember(tripId, memberId)) {
            throw new BusinessException(ActivityLogErrorCode.TRIP_ACCESS_DENIED);
        }
        return getActivityLogsForAuthorizedViewer(tripId, pageable);
    }

    public PageResponse<ActivityLogResponse> getActivityLogsForAuthorizedViewer(
            Long tripId,
            Pageable pageable
    ) {
        return PageResponse.from(activityLogRepository.findAllByTripIdOrderByCreatedAtDescIdDesc(tripId, pageable)
                .map(ActivityLogResponse::from));
    }
}
