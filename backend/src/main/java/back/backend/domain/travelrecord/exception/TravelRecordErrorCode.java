package back.backend.domain.travelrecord.exception;

import back.backend.global.exception.ErrorCode;
import org.springframework.http.HttpStatus;

public enum TravelRecordErrorCode implements ErrorCode {
    TRIP_DATES_REQUIRED(HttpStatus.CONFLICT, "TRAVEL_RECORD_409_1", "여행 기간을 먼저 확정해 주세요."),
    TRIP_NOT_FOUND(HttpStatus.NOT_FOUND, "TRAVEL_RECORD_404_1", "여행방을 찾을 수 없습니다."),
    VISITED_AT_OUT_OF_RANGE(HttpStatus.BAD_REQUEST, "TRAVEL_RECORD_400_1", "방문 일시는 여행 기간 안이어야 합니다."),
    TRIP_PLACE_NOT_FOUND(HttpStatus.NOT_FOUND, "TRAVEL_RECORD_404_2", "여행방에 등록된 장소를 찾을 수 없습니다."),
    EMPTY_RECORD(HttpStatus.BAD_REQUEST, "TRAVEL_RECORD_400_2", "메모 또는 사진을 하나 이상 입력해 주세요."),
    INVALID_IMAGE_URL(HttpStatus.BAD_REQUEST, "TRAVEL_RECORD_400_3", "올바르지 않은 사진 경로입니다."),
    DUPLICATE_PLACE_RECORD(HttpStatus.CONFLICT, "TRAVEL_RECORD_409_2", "이 장소에는 이미 공동 기록이 있습니다."),
    RECORD_NOT_FOUND(HttpStatus.NOT_FOUND, "TRAVEL_RECORD_404_3", "여행 기록을 찾을 수 없습니다."),
    EMPTY_PHOTO(HttpStatus.BAD_REQUEST, "TRAVEL_RECORD_400_4", "사진 파일을 선택해 주세요."),
    INVALID_PHOTO_TYPE(HttpStatus.BAD_REQUEST, "TRAVEL_RECORD_400_5", "JPG, PNG, WEBP 사진만 업로드할 수 있습니다."),
    PHOTO_TOO_LARGE(HttpStatus.BAD_REQUEST, "TRAVEL_RECORD_400_6", "사진은 한 장당 10MB 이하여야 합니다."),
    PHOTO_STORAGE_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "TRAVEL_RECORD_500_1", "사진 저장에 실패했습니다.");

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
