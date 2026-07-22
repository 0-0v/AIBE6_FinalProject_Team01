package back.backend.domain.collaboration.activitylog.dto;

import back.backend.domain.collaboration.activitylog.entity.ActivityLog;
import java.time.LocalDateTime;
import java.util.Map;

public record ActivityLogResponse(
        Long id,
        Long tripId,
        Long memberId,
        Long agentRunId,
        String actionType,
        String targetType,
        Long targetId,
        String description,
        Map<String, Object> metadata,
        LocalDateTime createdAt
) {

    public ActivityLogResponse {
        metadata = metadata == null ? null : Map.copyOf(metadata);
    }

    public static ActivityLogResponse from(ActivityLog activityLog) {
        return new ActivityLogResponse(
                activityLog.getId(),
                activityLog.getTripId(),
                activityLog.getMemberId(),
                activityLog.getAgentRunId(),
                activityLog.getActionType(),
                activityLog.getTargetType(),
                activityLog.getTargetId(),
                activityLog.getDescription(),
                activityLog.getMetadata(),
                activityLog.getCreatedAt()
        );
    }
}
