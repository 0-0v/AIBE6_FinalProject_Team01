package back.backend.domain.admin.exception;

import back.backend.global.exception.ErrorCode;
import org.springframework.http.HttpStatus;

public enum AdminErrorCode implements ErrorCode {
    MEMBER_NOT_FOUND(HttpStatus.NOT_FOUND, "ADMIN_404_1", "회원을 찾을 수 없습니다."),
    CANNOT_SUSPEND_SELF(HttpStatus.BAD_REQUEST, "ADMIN_400_1", "관리자는 자신의 계정을 정지할 수 없습니다."),
    CANNOT_SUSPEND_ADMIN(HttpStatus.BAD_REQUEST, "ADMIN_400_2", "관리자 계정은 정지할 수 없습니다."),
    MEMBER_NOT_SUSPENDED(HttpStatus.CONFLICT, "ADMIN_409_1", "정지 상태인 회원만 정지를 해제할 수 있습니다."),
    WITHDRAWN_MEMBER(HttpStatus.CONFLICT, "ADMIN_409_2", "탈퇴한 회원의 상태는 변경할 수 없습니다."),
    CANNOT_CHANGE_ADMIN_ROLE(HttpStatus.BAD_REQUEST, "ADMIN_400_3", "최고 관리자의 권한은 변경할 수 없습니다."),
    ALREADY_SUB_ADMIN(HttpStatus.CONFLICT, "ADMIN_409_3", "이미 부관리자 권한을 가진 회원입니다."),
    NOT_SUB_ADMIN(HttpStatus.CONFLICT, "ADMIN_409_4", "부관리자 권한을 가진 회원이 아닙니다.");

    private final HttpStatus status;
    private final String code;
    private final String message;

    AdminErrorCode(HttpStatus status, String code, String message) {
        this.status = status;
        this.code = code;
        this.message = message;
    }

    @Override public HttpStatus getStatus() { return status; }
    @Override public String getCode() { return code; }
    @Override public String getMessage() { return message; }
}
