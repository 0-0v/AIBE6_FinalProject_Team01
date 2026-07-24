package back.backend.domain.place.exception;

import back.backend.global.exception.ErrorCode;
import org.springframework.http.HttpStatus;

public enum PlaceErrorCode implements ErrorCode {

    PLACE_SEARCH_QUERY_REQUIRED(HttpStatus.BAD_REQUEST, "PLACE_SEARCH_QUERY_REQUIRED", "검색어를 입력해주세요."),
    PLACE_SEARCH_EXTERNAL_API_ERROR(HttpStatus.BAD_GATEWAY, "PLACE_SEARCH_EXTERNAL_API_ERROR", "장소 검색 중 오류가 발생했습니다."),
    TRIP_PLACE_NOT_FOUND(HttpStatus.NOT_FOUND, "TRIP_PLACE_NOT_FOUND", "여행 장소를 찾을 수 없습니다."),
    TRIP_PLACE_ALREADY_EXISTS(HttpStatus.CONFLICT, "TRIP_PLACE_ALREADY_EXISTS", "이미 여행에 추가된 장소입니다."),
    PLACE_VOTE_ALREADY_REQUESTED(HttpStatus.CONFLICT, "PLACE_VOTE_ALREADY_REQUESTED", "이미 갈래말래 투표가 신청된 장소입니다."),
    PLACE_VOTE_NOT_FOUND(HttpStatus.NOT_FOUND, "PLACE_VOTE_NOT_FOUND", "진행 중인 갈래말래 투표를 찾을 수 없습니다."),
    PLACE_VOTE_CLOSED(HttpStatus.CONFLICT, "PLACE_VOTE_CLOSED", "이미 종료된 갈래말래 투표입니다."),
    PLACE_COMMENT_NOT_FOUND(HttpStatus.NOT_FOUND, "PLACE_COMMENT_NOT_FOUND", "댓글을 찾을 수 없습니다."),
    PLACE_PHOTO_NAME_INVALID(HttpStatus.BAD_REQUEST, "PLACE_PHOTO_NAME_INVALID", "올바르지 않은 장소 사진 식별자입니다."),
    PLACE_PHOTO_NOT_FOUND(HttpStatus.NOT_FOUND, "PLACE_PHOTO_NOT_FOUND", "장소 사진을 찾을 수 없습니다."),
    PLACE_PHOTO_EXTERNAL_API_ERROR(HttpStatus.BAD_GATEWAY, "PLACE_PHOTO_EXTERNAL_API_ERROR", "장소 사진을 불러오지 못했습니다.");

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
