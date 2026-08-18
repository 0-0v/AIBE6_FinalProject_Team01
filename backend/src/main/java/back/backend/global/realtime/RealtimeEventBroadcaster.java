package back.backend.global.realtime;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
public class RealtimeEventBroadcaster {

    private final SimpMessagingTemplate messagingTemplate;
    private final RevokedWebSocketMemberRegistry revokedMemberRegistry;

    public RealtimeEventBroadcaster(
            SimpMessagingTemplate messagingTemplate,
            RevokedWebSocketMemberRegistry revokedMemberRegistry) {
        this.messagingTemplate = messagingTemplate;
        this.revokedMemberRegistry = revokedMemberRegistry;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void broadcast(RealtimeEvent event) {
        if (event.tripId() != null && !"NOTIFICATION_CHANGED".equals(event.type())) {
            messagingTemplate.convertAndSend("/topic/trips/" + event.tripId(), event);
        }
        if ("PUBLIC_CARD_CHANGED".equals(event.type())) {
            messagingTemplate.convertAndSend("/topic/public-cards", event);
        }
        for (Long recipientId : event.recipientIds()) {
            messagingTemplate.convertAndSendToUser(
                    recipientId.toString(),
                    "/queue/notifications",
                    event
            );
        }
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void broadcastAccountSuspension(AccountSuspendedEvent event) {
        revokedMemberRegistry.revoke(event.memberId());
        messagingTemplate.convertAndSendToUser(
                event.memberId().toString(),
                "/queue/account-status",
                event
        );
    }
}
