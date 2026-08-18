package back.backend.domain.trip.service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

@Component
public class TripPresenceService {
    private static final Duration ONLINE_WINDOW = Duration.ofSeconds(60);
    private final ConcurrentHashMap<PresenceKey, Instant> lastSeen = new ConcurrentHashMap<>();
    private final Clock clock;

    public TripPresenceService(Clock clock) {
        this.clock = clock;
    }

    public void touch(Long tripId, Long memberId) {
        lastSeen.put(new PresenceKey(tripId, memberId), Instant.now(clock));
    }

    public boolean isOnline(Long tripId, Long memberId) {
        Instant seenAt = lastSeen.get(new PresenceKey(tripId, memberId));
        return seenAt != null
                && seenAt.isAfter(Instant.now(clock).minus(ONLINE_WINDOW));
    }

    public void touchGuest(Long tripId, Long guestSessionId) {
        lastSeen.put(new PresenceKey(tripId, -guestSessionId), Instant.now(clock));
    }

    public boolean isGuestOnline(Long tripId, Long guestSessionId) {
        return isOnline(tripId, -guestSessionId);
    }

    private record PresenceKey(Long tripId, Long memberId) {
    }
}
