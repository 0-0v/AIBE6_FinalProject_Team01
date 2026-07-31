package back.backend.domain.itinerary.service;

import back.backend.domain.trip.entity.TravelPace;
import java.time.LocalTime;

/**
 * 여행방별 하루 일정 제약 설정.
 * ItineraryRoutePlanner 에 전달하여 하드코딩 없이 사용자 설정을 반영합니다.
 */
public record TripScheduleSettings(
        LocalTime dayStartTime,
        LocalTime dayEndTime,
        TravelPace travelPace
) {

    private static final TripScheduleSettings DEFAULT =
            new TripScheduleSettings(LocalTime.of(9, 0), LocalTime.of(21, 0), TravelPace.NORMAL);

    public static TripScheduleSettings defaultSettings() {
        return DEFAULT;
    }

    public int dayStartMinutes() {
        return dayStartTime.getHour() * 60 + dayStartTime.getMinute();
    }

    public int dayEndMinutes() {
        return dayEndTime.getHour() * 60 + dayEndTime.getMinute();
    }
}
