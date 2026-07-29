package back.backend.global.realtime;

import java.time.Instant;
import java.util.Set;
import java.util.UUID;

public record RealtimeEvent(
        String eventId,
        String type,
        Long tripId,
        String targetType,
        Long targetId,
        Set<Long> recipientIds,
        Instant occurredAt
) {
    public static RealtimeEvent notification(Long memberId, Long tripId, Long notificationId) {
        return new RealtimeEvent(
                UUID.randomUUID().toString(),
                "NOTIFICATION_CHANGED",
                tripId,
                "NOTIFICATION",
                notificationId,
                Set.of(memberId),
                Instant.now()
        );
    }

    public static RealtimeEvent activity(Long tripId, String targetType, Long targetId) {
        return new RealtimeEvent(
                UUID.randomUUID().toString(),
                "TRIP_CHANGED",
                tripId,
                targetType,
                targetId,
                Set.of(),
                Instant.now()
        );
    }

    public static RealtimeEvent publicCard(Long cardId) {
        return new RealtimeEvent(
                UUID.randomUUID().toString(),
                "PUBLIC_CARD_CHANGED",
                null,
                "PLAN_CARD",
                cardId,
                Set.of(),
                Instant.now()
        );
    }
}
