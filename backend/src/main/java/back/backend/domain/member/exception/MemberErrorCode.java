package back.backend.domain.member.exception;

import back.backend.global.exception.ErrorCode;
import org.springframework.http.HttpStatus;

public enum MemberErrorCode implements ErrorCode {
    MEMBER_NOT_FOUND(HttpStatus.NOT_FOUND, "MEMBER_404", "회원을 찾을 수 없습니다."),
    EMPTY_PROFILE_IMAGE(HttpStatus.BAD_REQUEST, "MEMBER_PROFILE_IMAGE_400_EMPTY", "업로드할 이미지 파일이 비어 있습니다."),
    INVALID_PROFILE_IMAGE_TYPE(HttpStatus.BAD_REQUEST, "MEMBER_PROFILE_IMAGE_400_TYPE", "이미지 파일(jpg, jpeg, png, webp)만 업로드할 수 있습니다."),
    PROFILE_IMAGE_TOO_LARGE(HttpStatus.BAD_REQUEST, "MEMBER_PROFILE_IMAGE_400_SIZE", "이미지 파일은 5MB 이하만 업로드할 수 있습니다."),
    PROFILE_IMAGE_STORAGE_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "MEMBER_PROFILE_IMAGE_500", "프로필 이미지 저장에 실패했습니다.");

    private final HttpStatus status;
    private final String code;
    private final String message;

    MemberErrorCode(HttpStatus status, String code, String message) {
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
