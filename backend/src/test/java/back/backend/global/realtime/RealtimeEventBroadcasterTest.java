package back.backend.global.realtime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;

import java.time.Instant;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.simp.SimpMessagingTemplate;

class RealtimeEventBroadcasterTest {

    @Test
    @DisplayName("t1 알림 이벤트는 회원 개인 채널에만 전달한다")
    void t1_notificationEventBroadcastsOnlyToMemberChannel() {
        SimpMessagingTemplate template = org.mockito.Mockito.mock(SimpMessagingTemplate.class);
        RealtimeEventBroadcaster broadcaster = broadcaster(template);
        RealtimeEvent event = new RealtimeEvent(
                "event-1", "NOTIFICATION_CHANGED", 10L, "NOTIFICATION", 20L,
                Set.of(1L), Instant.parse("2026-07-29T07:00:00Z"));

        broadcaster.broadcast(event);

        verify(template).convertAndSendToUser("1", "/queue/notifications", event);
        verifyNoMoreInteractions(template);
    }

    @Test
    @DisplayName("t2 여행방 변경 이벤트는 여행방 채널에 한 번 전달한다")
    void t2_tripEventBroadcastsOnceToTripChannel() {
        SimpMessagingTemplate template = org.mockito.Mockito.mock(SimpMessagingTemplate.class);
        RealtimeEventBroadcaster broadcaster = broadcaster(template);
        RealtimeEvent event = RealtimeEvent.activity(10L, "TRIP", 10L);

        broadcaster.broadcast(event);

        verify(template).convertAndSend("/topic/trips/10", event);
        verifyNoMoreInteractions(template);
    }

    @Test
    @DisplayName("t3 회원 정지 이벤트는 대상 회원 채널에 전달하고 연결 권한을 회수한다")
    void t3_accountSuspendedEventRevokesAndBroadcastsToTargetMember() {
        SimpMessagingTemplate template = org.mockito.Mockito.mock(SimpMessagingTemplate.class);
        RevokedWebSocketMemberRegistry registry = new RevokedWebSocketMemberRegistry();
        RealtimeEventBroadcaster broadcaster = new RealtimeEventBroadcaster(template, registry);
        AccountSuspendedEvent event = new AccountSuspendedEvent(7L, "notice-token");

        broadcaster.broadcastAccountSuspension(event);

        assertThat(registry.isRevoked(7L)).isTrue();
        verify(template).convertAndSendToUser("7", "/queue/account-status", event);
        verifyNoMoreInteractions(template);
    }

    private RealtimeEventBroadcaster broadcaster(SimpMessagingTemplate template) {
        return new RealtimeEventBroadcaster(template, new RevokedWebSocketMemberRegistry());
    }
}
