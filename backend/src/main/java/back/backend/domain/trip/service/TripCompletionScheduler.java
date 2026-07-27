package back.backend.domain.trip.service;

import java.time.Clock;
import java.time.LocalDate;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class TripCompletionScheduler {

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

    @Scheduled(cron = "0 5 0 * * *", zone = "Asia/Seoul")
    public void completeExpiredTrips() {
        tripCompletionService.completeExpiredTrips(LocalDate.now(clock));
    }
}
