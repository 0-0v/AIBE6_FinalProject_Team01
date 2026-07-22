package back.backend.domain.collaboration.notification.dto;

import back.backend.domain.collaboration.notification.entity.NotificationType;

public record NotificationCreateCommand(
        Long memberId,
        Long tripId,
        NotificationType notificationType,
        String title,
        String content,
        String targetType,
        Long targetId
) {
}
