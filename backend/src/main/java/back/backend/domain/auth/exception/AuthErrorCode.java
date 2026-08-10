package back.backend.domain.auth.exception;

import back.backend.global.exception.ErrorCode;
import org.springframework.http.HttpStatus;

public enum AuthErrorCode implements ErrorCode {
    EMAIL_ALREADY_EXISTS(HttpStatus.CONFLICT, "AUTH_409_EMAIL", "이미 사용 중인 이메일입니다."),
    NICKNAME_ALREADY_EXISTS(HttpStatus.CONFLICT, "AUTH_409_NICKNAME", "이미 사용 중인 닉네임입니다."),
    WITHDRAWN_ACCOUNT(
            HttpStatus.CONFLICT,
            "AUTH_409_WITHDRAWN_ACCOUNT",
            "탈퇴 계정의 개인정보 보관기간이 아직 지나지 않아 같은 이메일 또는 소셜 계정으로 "
                    + "재가입할 수 없습니다. 보관기간이 끝난 후 다시 시도해 주세요."),
    SUSPENDED_ACCOUNT(HttpStatus.FORBIDDEN, "AUTH_403_SUSPENDED", "관리자에 의해 이용이 정지된 계정입니다."),
    INVALID_CREDENTIALS(HttpStatus.UNAUTHORIZED, "AUTH_401_CREDENTIALS", "이메일 또는 비밀번호가 올바르지 않습니다."),
    INVALID_VERIFICATION_CODE(HttpStatus.BAD_REQUEST, "AUTH_400_CODE", "인증번호가 올바르지 않거나 만료되었습니다."),
    EMAIL_NOT_VERIFIED(HttpStatus.BAD_REQUEST, "AUTH_400_NOT_VERIFIED", "이메일 인증이 필요합니다."),
    EMAIL_SEND_FAILED(HttpStatus.BAD_GATEWAY, "AUTH_502_EMAIL", "인증 메일을 발송하지 못했습니다. 잠시 후 다시 시도해 주세요."),
    SOCIAL_ACCOUNT_PASSWORD_RESET(
            HttpStatus.BAD_REQUEST,
            "AUTH_400_SOCIAL_ACCOUNT",
            "소셜로그인으로 가입된 계정입니다."),
    LOCAL_ACCOUNT_NOT_FOUND(HttpStatus.BAD_REQUEST, "AUTH_400_LOCAL_ACCOUNT", "비밀번호를 재설정할 수 없는 계정입니다."),
    SAME_AS_CURRENT_PASSWORD(HttpStatus.BAD_REQUEST, "AUTH_400_SAME_PASSWORD", "이전에 사용하던 비밀번호와 동일한 비밀번호는 사용할 수 없습니다.");

    private final HttpStatus status;
    private final String code;
    private final String message;

    AuthErrorCode(HttpStatus status, String code, String message) {
        this.status = status;
        this.code = code;
        this.message = message;
    }

    public HttpStatus getStatus() {
        return status;
    }

    public String getCode() {
        return code;
    }

    public String getMessage() {
        return message;
    }
}
