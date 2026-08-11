package back.backend.domain.inquiry.exception;

import back.backend.global.exception.ErrorCode;
import org.springframework.http.HttpStatus;

public enum InquiryErrorCode implements ErrorCode {
    NOT_FOUND(HttpStatus.NOT_FOUND, "INQUIRY_404", "문의를 찾을 수 없습니다."),
    ALREADY_ANSWERED(HttpStatus.CONFLICT, "INQUIRY_409_ANSWERED", "이미 답변한 문의입니다."),
    RATE_LIMITED(HttpStatus.TOO_MANY_REQUESTS, "INQUIRY_429", "문의가 너무 자주 접수되었습니다. 잠시 후 다시 시도해 주세요.");

    private final HttpStatus status;
    private final String code;
    private final String message;
    InquiryErrorCode(HttpStatus status, String code, String message) {
        this.status = status; this.code = code; this.message = message;
    }
    public HttpStatus getStatus() { return status; }
    public String getCode() { return code; }
    public String getMessage() { return message; }
}
