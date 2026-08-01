package back.backend.domain.agent.service;

import back.backend.domain.itinerary.entity.ItineraryDay;
import back.backend.domain.itinerary.entity.ItineraryItem;
import back.backend.global.exception.BusinessException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

class AiReplanCutoffPolicyTest {

    private final AiReplanCutoffPolicy policy = new AiReplanCutoffPolicy();

    @Test
    @DisplayName("t1 현재 날짜보다 이전 Day의 일정은 재배치 대상에서 제외한다")
    void t1_previousDayIsFixed() {
        ItineraryDay day = mock(ItineraryDay.class);
        ItineraryItem item = mock(ItineraryItem.class);
        given(day.getItineraryDate()).willReturn(LocalDate.of(2026, 8, 1));

        boolean fixed = policy.isFixed(
                day,
                item,
                LocalDateTime.of(2026, 8, 2, 12, 0)
        );

        assertThat(fixed).isTrue();
    }

    @Test
    @DisplayName("t2 오늘 일정 중 종료 시각이 지난 항목은 재배치 대상에서 제외한다")
    void t2_finishedItemTodayIsFixed() {
        ItineraryDay day = mock(ItineraryDay.class);
        ItineraryItem item = mock(ItineraryItem.class);
        given(day.getItineraryDate()).willReturn(LocalDate.of(2026, 8, 2));
        given(item.getEndTime()).willReturn(LocalTime.of(11, 0));

        boolean fixed = policy.isFixed(
                day,
                item,
                LocalDateTime.of(2026, 8, 2, 12, 0)
        );

        assertThat(fixed).isTrue();
    }

    @Test
    @DisplayName("t3 오늘 일정 중 아직 시작하지 않은 항목은 재배치할 수 있다")
    void t3_upcomingItemTodayIsMovable() {
        ItineraryDay day = mock(ItineraryDay.class);
        ItineraryItem item = mock(ItineraryItem.class);
        given(day.getItineraryDate()).willReturn(LocalDate.of(2026, 8, 2));
        given(item.getEndTime()).willReturn(LocalTime.of(15, 0));

        boolean fixed = policy.isFixed(
                day,
                item,
                LocalDateTime.of(2026, 8, 2, 12, 0)
        );

        assertThat(fixed).isFalse();
    }

    @Test
    @DisplayName("t4 테스트 모드에서는 요청한 기준 시각을 재배치 기준으로 사용한다")
    void t4_testModeUsesRequestedCutoff() {
        LocalDateTime requested = LocalDateTime.of(2026, 8, 3, 14, 0);

        LocalDateTime resolved = policy.resolveReferenceTime(
                requested,
                true,
                LocalDateTime.of(2026, 8, 1, 10, 0)
        );

        assertThat(resolved).isEqualTo(requested);
    }

    @Test
    @DisplayName("t5 운영 모드에서는 임의 기준 시각 요청을 거절한다")
    void t5_productionModeRejectsRequestedCutoff() {
        LocalDateTime requested = LocalDateTime.of(2026, 8, 3, 14, 0);

        assertThatThrownBy(() -> policy.resolveReferenceTime(
                requested,
                false,
                LocalDateTime.of(2026, 8, 1, 10, 0)
        )).isInstanceOf(BusinessException.class);
    }
}
