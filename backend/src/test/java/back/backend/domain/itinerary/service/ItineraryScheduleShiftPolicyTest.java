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
