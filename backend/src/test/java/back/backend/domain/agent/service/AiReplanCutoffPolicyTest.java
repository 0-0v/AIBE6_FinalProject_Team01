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

    @Test
    @DisplayName("t6 Day 2의 일정을 선택하면 재배치 시작 날짜로 Day 2를 반환한다")
    void t6_selectedItemResolvesItsOwnDayAsReplanStart() {
        ItineraryDay day1 = mock(ItineraryDay.class);
        ItineraryDay day2 = mock(ItineraryDay.class);
        ItineraryItem day1Item = mock(ItineraryItem.class);
        ItineraryItem day2Item = mock(ItineraryItem.class);
        given(day1.getItineraryDate()).willReturn(LocalDate.of(2026, 8, 3));
        given(day2.getItineraryDate()).willReturn(LocalDate.of(2026, 8, 4));
        given(day1.getItems()).willReturn(List.of(day1Item));
        given(day2.getItems()).willReturn(List.of(day2Item));
        given(day1Item.getId()).willReturn(1L);
        given(day2Item.getId()).willReturn(2L);

        var startingDate = policy.startingDayDate(List.of(day1, day2), 2L);

        assertThat(startingDate).contains(LocalDate.of(2026, 8, 4));
    }

    @Test
    @DisplayName("t7 Day 2부터 재배치하면 Day 1은 AI 재배치 대상에서 제외한다")
    void t7_replanFromDay2ExcludesDay1() {
        ItineraryDay day1 = mock(ItineraryDay.class);
        ItineraryDay day2 = mock(ItineraryDay.class);
        ItineraryDay day3 = mock(ItineraryDay.class);
        given(day1.getItineraryDate()).willReturn(LocalDate.of(2026, 8, 3));
        given(day2.getItineraryDate()).willReturn(LocalDate.of(2026, 8, 4));
        given(day3.getItineraryDate()).willReturn(LocalDate.of(2026, 8, 5));

        var replannableDays = policy.replannableDaysFrom(
                List.of(day1, day2, day3),
                LocalDate.of(2026, 8, 4)
        );

        assertThat(replannableDays).containsExactly(day2, day3);
    }
}
