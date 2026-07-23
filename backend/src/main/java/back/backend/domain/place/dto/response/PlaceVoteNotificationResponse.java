package back.backend.domain.place.dto.response;

public record PlaceVoteNotificationResponse(
        Long notificationId,
        Long tripId,
        Long tripPlaceId,
        String content,
        boolean read,
        String createdAt
) {}
