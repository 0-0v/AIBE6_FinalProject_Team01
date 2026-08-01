package back.backend.domain.agent.service;

import back.backend.domain.itinerary.entity.ItineraryDay;
import back.backend.domain.itinerary.entity.ItineraryItem;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
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
    @DisplayName("t4 선택한 일정부터 이후의 남은 일정만 재배치 대상으로 반환한다")
    void t4_selectedItemAndFollowingItemsAreMovable() {
        ItineraryDay day = mock(ItineraryDay.class);
        ItineraryItem first = mock(ItineraryItem.class);
        ItineraryItem selected = mock(ItineraryItem.class);
        ItineraryItem following = mock(ItineraryItem.class);
        given(day.getItineraryDate()).willReturn(LocalDate.of(2026, 8, 3));
        given(day.getItems()).willReturn(List.of(first, selected, following));
        given(first.getId()).willReturn(1L);
        given(selected.getId()).willReturn(2L);
        given(following.getId()).willReturn(3L);
        given(first.getSortOrder()).willReturn(1);
        given(selected.getSortOrder()).willReturn(2);
        given(following.getSortOrder()).willReturn(3);

        var movableIds = policy.movableItemIdsFrom(
                List.of(day),
                LocalDateTime.of(2026, 8, 2, 12, 0),
                2L
        );

        assertThat(movableIds).containsExactlyInAnyOrder(2L, 3L);
    }

    @Test
    @DisplayName("t5 이미 지난 일정을 시작점으로 선택하면 재배치 대상을 반환하지 않는다")
    void t5_pastStartingItemCannotBeReplanned() {
        ItineraryDay day = mock(ItineraryDay.class);
        ItineraryItem item = mock(ItineraryItem.class);
        given(day.getItineraryDate()).willReturn(LocalDate.of(2026, 8, 1));
        given(day.getItems()).willReturn(List.of(item));

        var movableIds = policy.movableItemIdsFrom(
                List.of(day),
                LocalDateTime.of(2026, 8, 2, 12, 0),
                1L
        );

        assertThat(movableIds).isEmpty();
    }
}
