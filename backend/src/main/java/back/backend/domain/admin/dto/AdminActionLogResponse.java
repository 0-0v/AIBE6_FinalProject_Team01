package back.backend.domain.admin.dto;

import back.backend.domain.admin.entity.AdminActionLog;
import back.backend.domain.admin.entity.AdminActionType;
import java.time.LocalDateTime;

public record AdminActionLogResponse(
        Long id, Long adminId, AdminActionType actionType, String targetType,
        Long targetId, String reason, LocalDateTime createdAt
) {
    public static AdminActionLogResponse from(AdminActionLog log) {
        return new AdminActionLogResponse(log.getId(), log.getAdminId(), log.getActionType(),
                log.getTargetType(), log.getTargetId(), log.getReason(), log.getCreatedAt());
    }
}
