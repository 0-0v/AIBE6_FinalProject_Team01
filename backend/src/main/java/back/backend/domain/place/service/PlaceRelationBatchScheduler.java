package back.backend.domain.place.service;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@Profile("!test")
@RequiredArgsConstructor
public class PlaceRelationBatchScheduler {

    private static final Logger log =
            LoggerFactory.getLogger(PlaceRelationBatchScheduler.class);

    private final PlaceRelationService placeRelationService;

    @Scheduled(cron = "${app.place-relation.recompute-cron:0 0 4 * * *}")
    public void recomputeCoVisitCounts() {
        try {
            placeRelationService.recomputeCoVisitCounts();
        } catch (RuntimeException exception) {
            log.error("장소 공동방문 관계 재계산 실패", exception);
        }
    }
}
