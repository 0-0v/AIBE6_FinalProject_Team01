package back.backend.domain.place.dto.response;

import java.time.LocalDateTime;

public record PlaceVoteNotificationResponse(
        Long notificationId,
        Long tripId,
        Long tripPlaceId,
        String content,
        boolean read,
        LocalDateTime createdAt
) {}
