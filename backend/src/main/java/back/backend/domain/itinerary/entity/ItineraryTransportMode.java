package back.backend.domain.itinerary.entity;

public enum ItineraryTransportMode {

    AUTO("자동 추천", null, null, 0.0),
    WALKING("도보", "walking", null, 5.0),
    DRIVING("자동차", "driving", null, 30.0),
    TAXI("택시", "driving", null, 30.0),
    SUBWAY("지하철", "transit", "subway", 20.0),
    BUS("버스", "transit", "bus", 20.0),
    TRANSIT("대중교통", "transit", null, 20.0),
    RAIL("철도", "transit", "rail", 20.0);

    private final String displayName;
    private final String directionsMode;
    private final String transitMode;
    private final double fallbackSpeedKmh;

    ItineraryTransportMode(
            String displayName,
            String directionsMode,
            String transitMode,
            double fallbackSpeedKmh
    ) {
        this.displayName = displayName;
        this.directionsMode = directionsMode;
        this.transitMode = transitMode;
        this.fallbackSpeedKmh = fallbackSpeedKmh;
    }

    public String displayName() {
        return displayName;
    }

    public String directionsMode() {
        return directionsMode;
    }

    public String transitMode() {
        return transitMode;
    }

    public double fallbackSpeedKmh() {
        return fallbackSpeedKmh;
    }

    public static ItineraryTransportMode infer(int distanceMeters) {
        if (distanceMeters < 500) {
            return WALKING;
        }
        // 500m~5km 구간: BUS(TRANSIT)은 departureTime 필수라 자동 추론 시 실패율이 높음
        // DRIVING으로 추론하고, 실제 이동 수단은 사용자가 직접 선택하도록 한다
        return DRIVING;
    }

    public static ItineraryTransportMode fromDisplayName(String displayName) {
        for (ItineraryTransportMode mode : values()) {
            if (mode.displayName.equals(displayName)) {
                return mode;
            }
        }
        return null;
    }
}
