package back.backend.domain.trip.service;

import static org.mockito.Mockito.verify;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class TripCompletionSchedulerTest {

    @Mock TripCompletionService tripCompletionService;

    @Test
    @DisplayName("t1 자동 완료 작업을 실행하면 한국 시간의 오늘 날짜로 만료 여행을 처리한다")
    void t1_completeExpiredTripsUsesKoreanCurrentDate() {
        Clock clock = Clock.fixed(
                Instant.parse("2026-07-31T15:05:00Z"),
                ZoneId.of("Asia/Seoul")
        );
        TripCompletionScheduler scheduler = new TripCompletionScheduler(
                tripCompletionService,
                clock
        );

        scheduler.completeExpiredTrips();

        verify(tripCompletionService).completeExpiredTrips(LocalDate.of(2026, 8, 1));
    }
}
