package back.backend.domain.itinerary.service;

import back.backend.domain.itinerary.entity.ItineraryTransportMode;
import back.backend.domain.trip.entity.TravelPace;
import java.time.LocalTime;

/**
 * 여행방별 하루 일정 제약 설정.
 * ItineraryRoutePlanner 에 전달하여 하드코딩 없이 사용자 설정을 반영합니다.
 */
public record TripScheduleSettings(
        LocalTime dayStartTime,
        LocalTime dayEndTime,
        TravelPace travelPace,
        ItineraryTransportMode defaultTransportMode
) {

    private static final TripScheduleSettings DEFAULT =
            new TripScheduleSettings(LocalTime.of(9, 0), LocalTime.of(21, 0), TravelPace.NORMAL, null);

    public static TripScheduleSettings defaultSettings() {
        return DEFAULT;
    }

    public static TripScheduleSettings of(LocalTime start, LocalTime end, TravelPace pace) {
        return new TripScheduleSettings(start, end, pace, null);
    }

    public int dayStartMinutes() {
        return dayStartTime.getHour() * 60 + dayStartTime.getMinute();
    }

    public int dayEndMinutes() {
        return dayEndTime.getHour() * 60 + dayEndTime.getMinute();
    }

    /**
     * 설정된 기본 이동 수단이 있으면 사용하고, 없으면 거리 기반으로 추론합니다.
     */
    public ItineraryTransportMode effectiveTransportMode(int haversineMeters) {
        if (defaultTransportMode != null && defaultTransportMode != ItineraryTransportMode.AUTO) {
            return defaultTransportMode;
        }
        return ItineraryTransportMode.infer(haversineMeters);
    }
}
