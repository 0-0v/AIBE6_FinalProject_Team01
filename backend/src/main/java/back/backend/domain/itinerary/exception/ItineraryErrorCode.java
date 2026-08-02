package back.backend.domain.itinerary.exception;

import back.backend.global.exception.ErrorCode;
import org.springframework.http.HttpStatus;

public enum ItineraryErrorCode implements ErrorCode {

    ITINERARY_DAY_NOT_FOUND(HttpStatus.NOT_FOUND, "ITINERARY_DAY_NOT_FOUND", "일정 날짜를 찾을 수 없습니다."),
    ITINERARY_ITEM_NOT_FOUND(HttpStatus.NOT_FOUND, "ITINERARY_ITEM_NOT_FOUND", "일정 항목을 찾을 수 없습니다."),
    ITINERARY_PLACE_NOT_SAVED(HttpStatus.FORBIDDEN, "ITINERARY_PLACE_NOT_SAVED", "확정된 장소만 일정에 배치할 수 있습니다."),
    ITINERARY_ITEM_ALREADY_EXISTS(HttpStatus.CONFLICT, "ITINERARY_ITEM_ALREADY_EXISTS", "일정에 이미 배치된 장소입니다."),
    ITINERARY_SORT_ORDER_CONFLICT(HttpStatus.CONFLICT, "ITINERARY_SORT_ORDER_CONFLICT", "해당 순서에 이미 일정 항목이 있습니다."),
    ITINERARY_INVALID_ITEM_ORDER(HttpStatus.BAD_REQUEST, "ITINERARY_INVALID_ITEM_ORDER", "일정 항목 순서가 올바르지 않습니다."),
    ITINERARY_INVALID_ROUTE_PLAN(HttpStatus.BAD_REQUEST, "ITINERARY_INVALID_ROUTE_PLAN", "적용할 AI 동선 계획이 올바르지 않습니다."),
    ITINERARY_ROUTE_SEGMENT_PASSED(HttpStatus.BAD_REQUEST, "ITINERARY_ROUTE_SEGMENT_PASSED", "이미 지난 일정 구간은 장소를 추천할 수 없습니다."),
    ITINERARY_INVALID_TIME(HttpStatus.BAD_REQUEST, "ITINERARY_INVALID_TIME", "시간 형식이 올바르지 않습니다."),
    ITINERARY_INVALID_TIME_RANGE(HttpStatus.BAD_REQUEST, "ITINERARY_INVALID_TIME_RANGE", "종료 시간은 시작 시간보다 빠를 수 없습니다."),
    ITINERARY_NEXT_PLACE_NOT_FOUND(HttpStatus.BAD_REQUEST, "ITINERARY_NEXT_PLACE_NOT_FOUND", "다음 장소가 없어 이동수단을 변경할 수 없습니다.");

    private final HttpStatus status;
    private final String code;
    private final String message;

    ItineraryErrorCode(HttpStatus status, String code, String message) {
        this.status = status;
        this.code = code;
        this.message = message;
    }

    @Override public HttpStatus getStatus() { return status; }
    @Override public String getCode() { return code; }
    @Override public String getMessage() { return message; }
}
