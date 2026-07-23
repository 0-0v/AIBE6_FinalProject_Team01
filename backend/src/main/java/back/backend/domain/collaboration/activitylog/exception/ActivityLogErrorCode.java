package back.backend.domain.collaboration.activitylog.exception;

import back.backend.global.exception.ErrorCode;
import org.springframework.http.HttpStatus;

public enum ActivityLogErrorCode implements ErrorCode {
    TRIP_ACCESS_DENIED(HttpStatus.FORBIDDEN, "ACTIVITY_LOG_403_1", "여행 활동 로그를 조회할 권한이 없습니다.");

    private final HttpStatus status;
    private final String code;
    private final String message;

    ActivityLogErrorCode(HttpStatus status, String code, String message) {
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
