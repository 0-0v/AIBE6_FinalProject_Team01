package back.backend.domain.agent.dto.request;

public enum AiReplanReason {
    BUSINESS_HOURS("영업시간 변경", 0),
    WEATHER("날씨 문제", 60),
    TEMPORARY_CLOSURE("임시 휴무", 0),
    SCHEDULE_DELAY("일정 지연", 30),
    USER_REPORTED_CROWD("현장 혼잡", 60),
    FATIGUE("체력·컨디션", 30);

    private final String label;
    private final int minimumDelayMinutes;

    AiReplanReason(String label, int minimumDelayMinutes) {
        this.label = label;
        this.minimumDelayMinutes = minimumDelayMinutes;
    }

    public String label() {
        return label;
    }

    public int minimumDelayMinutes() {
        return minimumDelayMinutes;
    }
}
