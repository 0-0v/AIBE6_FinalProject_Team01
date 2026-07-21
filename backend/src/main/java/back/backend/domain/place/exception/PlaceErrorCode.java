package back.backend.domain.place.exception;

import back.backend.global.exception.ErrorCode;
import org.springframework.http.HttpStatus;

public enum PlaceErrorCode implements ErrorCode {

    PLACE_SEARCH_QUERY_REQUIRED(HttpStatus.BAD_REQUEST, "PLACE_SEARCH_QUERY_REQUIRED", "검색어를 입력해주세요."),
    PLACE_SEARCH_EXTERNAL_API_ERROR(HttpStatus.BAD_GATEWAY, "PLACE_SEARCH_EXTERNAL_API_ERROR", "장소 검색 중 오류가 발생했습니다."),
    TRIP_PLACE_NOT_FOUND(HttpStatus.NOT_FOUND, "TRIP_PLACE_NOT_FOUND", "여행 장소를 찾을 수 없습니다."),
    TRIP_PLACE_ALREADY_EXISTS(HttpStatus.CONFLICT, "TRIP_PLACE_ALREADY_EXISTS", "이미 여행에 추가된 장소입니다.");

    private final HttpStatus status;
    private final String code;
    private final String message;

    PlaceErrorCode(HttpStatus status, String code, String message) {
        this.status = status;
        this.code = code;
        this.message = message;
    }

    @Override
    public HttpStatus getStatus() {
        return status;
    }

    @Override
    public String getCode() {
        return code;
    }

    @Override
    public String getMessage() {
        return message;
    }
}
