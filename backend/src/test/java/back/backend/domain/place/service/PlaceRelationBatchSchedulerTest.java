package back.backend.domain.place.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class PlaceRelationBatchSchedulerTest {

    @Mock
    private PlaceRelationService placeRelationService;

    @Test
    @DisplayName("t1 스케줄 실행 시 공동방문 재계산을 위임한다")
    void t1_recomputeCoVisitCountsDelegatesToService() {
        PlaceRelationBatchScheduler scheduler =
                new PlaceRelationBatchScheduler(placeRelationService);

        scheduler.recomputeCoVisitCounts();

        verify(placeRelationService).recomputeCoVisitCounts();
    }

    @Test
    @DisplayName("t2 재계산 중 예외가 발생해도 스케줄러가 예외를 전파하지 않는다")
    void t2_recomputeFailureDoesNotPropagateException() {
        PlaceRelationBatchScheduler scheduler =
                new PlaceRelationBatchScheduler(placeRelationService);
        doThrow(new IllegalStateException("temporary failure"))
                .when(placeRelationService)
                .recomputeCoVisitCounts();

        assertThatCode(scheduler::recomputeCoVisitCounts)
                .doesNotThrowAnyException();
    }
}
