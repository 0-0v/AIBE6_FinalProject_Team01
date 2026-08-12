package back.backend.domain.itinerary.dto.request;

/**
 * AI 동선 추천 미리보기 요청 시 사용자가 설정하는 옵션.
 * null 필드는 여행방 설정값을 그대로 사용합니다.
 */
public record RoutePlanSettingsRequest(
        String transportMode,
        String dayStartTime,
        String dayEndTime,
        String travelPace,
        Long dayId
) {}
