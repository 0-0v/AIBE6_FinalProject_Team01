package back.backend.domain.collaboration.activitylog.dto;

import java.util.Map;

public record ActivityLogCreateCommand(
        Long tripId,
        Long memberId,
        String actionType,
        String targetType,
        Long targetId,
        String description,
        Map<String, Object> metadata
) {
}
