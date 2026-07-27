package back.backend.domain.trip.service;

import java.time.Clock;
import java.time.LocalDate;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.context.annotation.Profile;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Component
@Profile("!test")
public class TripCompletionScheduler {

    private static final Logger log = LoggerFactory.getLogger(TripCompletionScheduler.class);

    private final TripCompletionService tripCompletionService;
    private final Clock clock;

    public TripCompletionScheduler(TripCompletionService tripCompletionService, Clock clock) {
        this.tripCompletionService = tripCompletionService;
        this.clock = clock;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void completeMissedTripsOnStartup() {
        completeExpiredTrips();
    }

    @Scheduled(cron = "0 * * * * *", zone = "Asia/Seoul")
    public void completeExpiredTrips() {
        LocalDate today = LocalDate.now(clock);
        try {
            tripCompletionService.completeExpiredTrips(today);
        } catch (RuntimeException exception) {
            log.error("Failed to complete expired trips for date={}", today, exception);
        }
    }
}
