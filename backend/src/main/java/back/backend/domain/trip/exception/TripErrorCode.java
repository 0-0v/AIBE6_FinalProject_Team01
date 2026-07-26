package back.backend.domain.trip.exception;

import back.backend.global.exception.ErrorCode;
import org.springframework.http.HttpStatus;

public enum TripErrorCode implements ErrorCode {
    TRIP_NOT_FOUND(HttpStatus.NOT_FOUND, "TRIP_404", "여행방을 찾을 수 없습니다."),
    INVALID_TRIP(HttpStatus.BAD_REQUEST, "TRIP_400", "여행방 입력값이 올바르지 않습니다."),
    TRIP_ALREADY_FINISHED(HttpStatus.CONFLICT, "TRIP_409", "이미 완료되었거나 취소된 여행방입니다."),
    TRIP_CARD_ALREADY_EXISTS(HttpStatus.CONFLICT, "TRIP_CARD_409", "이미 여행 카드가 생성되었습니다."),
    INVITATION_NOT_FOUND(HttpStatus.NOT_FOUND, "TRIP_INVITATION_404", "유효한 초대 링크를 찾을 수 없습니다."),
    GUEST_ACCESS_DENIED(HttpStatus.FORBIDDEN, "TRIP_GUEST_403", "게스트 여행방 조회 권한이 없습니다."),
    INVALID_DATE_AVAILABILITY(
            HttpStatus.BAD_REQUEST,
            "TRIP_DATE_AVAILABILITY_400",
            "가능 날짜는 2000년부터 2100년 사이에서 최대 366개까지 선택할 수 있습니다."
    ),
    DATE_PROPOSAL_NOT_FOUND(HttpStatus.NOT_FOUND, "TRIP_DATE_PROPOSAL_404", "날짜 제안을 찾을 수 없습니다."),
    DATE_PROPOSAL_CLOSED(HttpStatus.CONFLICT, "TRIP_DATE_PROPOSAL_409", "이미 종료된 날짜 제안입니다.");

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
