package back.backend.global.realtime;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;

import java.time.Instant;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.simp.SimpMessagingTemplate;

class RealtimeEventBroadcasterTest {

    @Test
    @DisplayName("t1 알림 이벤트를 발행하면 회원 개인 채널에만 전달한다")
    void t1_notificationEventBroadcastsOnlyToMemberChannel() {
        SimpMessagingTemplate messagingTemplate =
                org.mockito.Mockito.mock(SimpMessagingTemplate.class);
        RealtimeEventBroadcaster broadcaster =
                new RealtimeEventBroadcaster(messagingTemplate);
        RealtimeEvent event = new RealtimeEvent(
                "event-1",
                "NOTIFICATION_CHANGED",
                10L,
                "NOTIFICATION",
                20L,
                Set.of(1L),
                Instant.parse("2026-07-29T07:00:00Z")
        );

        broadcaster.broadcast(event);

        verify(messagingTemplate).convertAndSendToUser("1", "/queue/notifications", event);
        verifyNoMoreInteractions(messagingTemplate);
    }

    @Test
    @DisplayName("t2 여행방 변경 이벤트를 발행하면 여행방 채널에 한 번만 전달한다")
    void t2_tripEventBroadcastsOnceToTripChannel() {
        SimpMessagingTemplate messagingTemplate =
                org.mockito.Mockito.mock(SimpMessagingTemplate.class);
        RealtimeEventBroadcaster broadcaster =
                new RealtimeEventBroadcaster(messagingTemplate);
        RealtimeEvent event = RealtimeEvent.activity(10L, "TRIP", 10L);

        broadcaster.broadcast(event);

        verify(messagingTemplate).convertAndSend("/topic/trips/10", event);
        verifyNoMoreInteractions(messagingTemplate);
    }
}
