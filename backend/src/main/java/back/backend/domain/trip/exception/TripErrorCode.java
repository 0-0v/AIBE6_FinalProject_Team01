package back.backend.domain.trip.exception;

import back.backend.global.exception.ErrorCode;
import org.springframework.http.HttpStatus;

public enum TripErrorCode implements ErrorCode {
    TRIP_NOT_FOUND(HttpStatus.NOT_FOUND, "TRIP_404", "여행방을 찾을 수 없습니다."),
    INVALID_TRIP(HttpStatus.BAD_REQUEST, "TRIP_400", "여행방 입력값이 올바르지 않습니다."),
    TRIP_ALREADY_FINISHED(HttpStatus.CONFLICT, "TRIP_409", "이미 완료되었거나 취소된 여행방입니다."),
    TRIP_CARD_ALREADY_EXISTS(HttpStatus.CONFLICT, "TRIP_CARD_409", "이미 여행 카드가 생성되었습니다.");

    private final HttpStatus status;
    private final String code;
    private final String message;

    TripErrorCode(HttpStatus status, String code, String message) {
        this.status = status;
        this.code = code;
        this.message = message;
    }

    public HttpStatus getStatus() { return status; }
    public String getCode() { return code; }
    public String getMessage() { return message; }
}
