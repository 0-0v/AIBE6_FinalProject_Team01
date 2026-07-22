package back.backend.domain.collaboration.activitylog.service;

import back.backend.domain.collaboration.activitylog.dto.ActivityLogCreateCommand;
import back.backend.domain.collaboration.activitylog.entity.ActivityLog;
import back.backend.domain.collaboration.activitylog.repository.ActivityLogRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class ActivityLogService {

    private final ActivityLogRepository activityLogRepository;

    public ActivityLogService(ActivityLogRepository activityLogRepository) {
        this.activityLogRepository = activityLogRepository;
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
}
