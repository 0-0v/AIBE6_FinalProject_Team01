package back.backend.domain.itinerary.service;

import back.backend.domain.itinerary.entity.ItineraryItem;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class ItineraryScheduleShiftPolicyTest {

    @Test
    @DisplayName("t1 이동 시간이 자동 연결된 다음 일정인지 판별한다")
    void t1_detectsAutomaticallyLinkedSchedule() {
        ItineraryItem current = itemAt("09:00", "10:00");
        ItineraryItem next = itemAt("10:20", "11:00");

        assertThat(ItineraryScheduleShiftPolicy.isAutomaticallyLinked(
                current,
                next,
                20
        )).isTrue();
    }

    @Test
    @DisplayName("t2 이동 시간 증가분만큼 뒤 일정을 함께 이동한다")
    void t2_shiftsFollowingSchedulesByTravelTimeDifference() {
        ItineraryItem first = itemAt("10:20", "11:00");
        ItineraryItem second = itemAt("11:30", "12:30");

        ItineraryScheduleShiftPolicy.shiftFollowingTimesIfNeeded(
                List.of(first, second),
                20,
                35,
                true
        );

        assertThat(first.getStartTime()).isEqualTo(LocalTime.of(10, 35));
        assertThat(first.getEndTime()).isEqualTo(LocalTime.of(11, 15));
        assertThat(second.getStartTime()).isEqualTo(LocalTime.of(11, 45));
        assertThat(second.getEndTime()).isEqualTo(LocalTime.of(12, 45));
    }

    @Test
    @DisplayName("t3 날짜 경계를 넘는 이동이면 기존 일정 시간을 유지한다")
    void t3_keepsSchedulesWhenShiftCrossesDayBoundary() {
        ItineraryItem item = itemAt("23:30", "23:50");

        ItineraryScheduleShiftPolicy.shiftFollowingTimesIfNeeded(
                List.of(item),
                10,
                30,
                true
        );

        assertThat(item.getStartTime()).isEqualTo(LocalTime.of(23, 30));
        assertThat(item.getEndTime()).isEqualTo(LocalTime.of(23, 50));
    }

    @Test
    @DisplayName("t4 실제 이동시간과 준비 여유를 반영해 적용 일정 시간을 순차 재계산한다")
    void t4_alignsAppliedScheduleWithActualTravelAndBuffer() {
        ItineraryItem first = itemAt("09:00", "10:00");
        first.updateSortOrder(0);
        first.updateTravelInformation(16, 8500, "자동차");
        ItineraryItem second = itemAt("10:10", "12:10");
        second.updateSortOrder(1);
        second.updateTravelInformation(24, 9800, "자동차");
        ItineraryItem third = itemAt("12:20", "13:05");
        third.updateSortOrder(2);

        ItineraryScheduleShiftPolicy.alignAppliedPlanTimes(
                List.of(first, second, third)
        );

        assertThat(first.getStartTime()).isEqualTo(LocalTime.of(9, 0));
        assertThat(first.getEndTime()).isEqualTo(LocalTime.of(10, 0));
        assertThat(second.getStartTime()).isEqualTo(LocalTime.of(10, 30));
        assertThat(second.getEndTime()).isEqualTo(LocalTime.of(12, 30));
        assertThat(third.getStartTime()).isEqualTo(LocalTime.of(13, 5));
        assertThat(third.getEndTime()).isEqualTo(LocalTime.of(13, 50));
    }

    @Test
    @DisplayName("t5 실제 이동시간을 구하지 못하면 미리보기 일정을 유지한다")
    void t5_keepsPreviewScheduleWhenActualTravelIsUnavailable() {
        ItineraryItem first = itemAt("09:00", "10:00");
        first.updateSortOrder(0);
        ItineraryItem second = itemAt("10:10", "12:10");
        second.updateSortOrder(1);

        ItineraryScheduleShiftPolicy.alignAppliedPlanTimes(
                List.of(first, second)
        );

        assertThat(second.getStartTime()).isEqualTo(LocalTime.of(10, 10));
        assertThat(second.getEndTime()).isEqualTo(LocalTime.of(12, 10));
    }

    private ItineraryItem itemAt(String startTime, String endTime) {
        ItineraryItem item = ItineraryItem.create(null, null, 0);
        item.updateDetails(
                LocalTime.parse(startTime),
                LocalTime.parse(endTime),
                null,
                null,
                null,
                null
        );
        return item;
    }
}
