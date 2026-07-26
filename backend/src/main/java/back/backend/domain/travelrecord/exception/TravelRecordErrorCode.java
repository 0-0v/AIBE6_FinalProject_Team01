package back.backend.domain.travelrecord.exception;

import back.backend.global.exception.ErrorCode;
import org.springframework.http.HttpStatus;

public enum TravelRecordErrorCode implements ErrorCode {
    TRIP_DATES_REQUIRED(HttpStatus.CONFLICT, "TRAVEL_RECORD_409_1", "여행 기간을 먼저 확정해 주세요."),
    VISITED_AT_OUT_OF_RANGE(HttpStatus.BAD_REQUEST, "TRAVEL_RECORD_400_1", "방문 일시는 여행 기간 안이어야 합니다."),
    TRIP_PLACE_NOT_FOUND(HttpStatus.NOT_FOUND, "TRAVEL_RECORD_404_1", "여행방에 등록된 장소를 찾을 수 없습니다."),
    EMPTY_RECORD(HttpStatus.BAD_REQUEST, "TRAVEL_RECORD_400_2", "메모 또는 사진을 하나 이상 입력해 주세요."),
    INVALID_IMAGE_URL(HttpStatus.BAD_REQUEST, "TRAVEL_RECORD_400_3", "올바르지 않은 사진 경로입니다."),
    RETROSPECTIVE_NOT_FOUND(HttpStatus.NOT_FOUND, "RETROSPECTIVE_404_1", "작성한 회고를 찾을 수 없습니다.");

    private final HttpStatus status;
    private final String code;
    private final String message;

    TravelRecordErrorCode(HttpStatus status, String code, String message) {
        this.status = status;
        this.code = code;
        this.message = message;
    }

    public HttpStatus getStatus() { return status; }
    public String getCode() { return code; }
    public String getMessage() { return message; }
}
