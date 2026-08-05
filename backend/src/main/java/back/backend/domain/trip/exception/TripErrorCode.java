package back.backend.domain.trip.exception;

import back.backend.global.exception.ErrorCode;
import org.springframework.http.HttpStatus;

public enum TripErrorCode implements ErrorCode {
    TRIP_NOT_FOUND(HttpStatus.NOT_FOUND, "TRIP_404", "여행방을 찾을 수 없습니다."),
    INVALID_TRIP(HttpStatus.BAD_REQUEST, "TRIP_400", "여행방 입력값이 올바르지 않습니다."),
    TRIP_ALREADY_FINISHED(HttpStatus.CONFLICT, "TRIP_409", "이미 완료되었거나 취소된 여행방입니다."),
    TRIP_HAS_OTHER_MEMBERS(HttpStatus.CONFLICT, "TRIP_DELETE_409", "다른 멤버가 있는 여행방은 삭제할 수 없습니다."),
    LAST_TRIP_MEMBER(HttpStatus.CONFLICT, "TRIP_LEAVE_409", "마지막 멤버는 여행방을 삭제해야 합니다."),
    TRIP_VISIBILITY_NOT_AVAILABLE(
            HttpStatus.CONFLICT,
            "TRIP_VISIBILITY_409",
            "여행방 공개 설정은 여행 완료 후 변경할 수 있습니다."
    ),
    TRIP_CARD_ALREADY_EXISTS(HttpStatus.CONFLICT, "TRIP_CARD_409", "이미 여행 카드가 생성되었습니다."),
    TRIP_CARD_NOT_FOUND(HttpStatus.NOT_FOUND, "TRIP_CARD_404", "여행 카드를 찾을 수 없습니다."),
    INVITATION_NOT_FOUND(HttpStatus.NOT_FOUND, "TRIP_INVITATION_404", "유효한 초대 링크를 찾을 수 없습니다."),
    GUEST_ACCESS_DENIED(HttpStatus.FORBIDDEN, "TRIP_GUEST_403", "게스트 여행방 조회 권한이 없습니다."),
    INVALID_DATE_AVAILABILITY(
            HttpStatus.BAD_REQUEST,
            "TRIP_DATE_AVAILABILITY_400",
            "가능 날짜는 2000년부터 2100년 사이에서 최대 366개까지 선택할 수 있습니다."
    ),
    DATE_PROPOSAL_NOT_FOUND(HttpStatus.NOT_FOUND, "TRIP_DATE_PROPOSAL_404", "날짜 제안을 찾을 수 없습니다."),
    DATE_PROPOSAL_CLOSED(HttpStatus.CONFLICT, "TRIP_DATE_PROPOSAL_409", "이미 종료된 날짜 제안입니다."),
    EMPTY_COVER_IMAGE(HttpStatus.BAD_REQUEST, "TRIP_COVER_400_1", "여행방 이미지를 선택해 주세요."),
    INVALID_COVER_IMAGE_TYPE(HttpStatus.BAD_REQUEST, "TRIP_COVER_400_2", "JPG, PNG, WEBP 이미지만 등록할 수 있습니다."),
    COVER_IMAGE_TOO_LARGE(HttpStatus.BAD_REQUEST, "TRIP_COVER_400_3", "여행방 이미지는 10MB 이하여야 합니다."),
    INVALID_COVER_IMAGE_PRESET(HttpStatus.BAD_REQUEST, "TRIP_COVER_400_4", "존재하지 않는 기본 이미지입니다."),
    COVER_IMAGE_STORAGE_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "TRIP_COVER_500_1", "여행방 이미지 저장에 실패했습니다.");

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
