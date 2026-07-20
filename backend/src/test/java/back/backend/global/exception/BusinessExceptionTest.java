package back.backend.global.exception;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class BusinessExceptionTest {

    @Test
    @DisplayName("t1 공통 에러 코드로 생성한 예외는 기본 메시지와 에러 코드를 유지한다")
    void t1_createExceptionWithDefaultMessage() {
        BusinessException exception = new BusinessException(CommonErrorCode.NOT_FOUND);

        assertThat(exception.getMessage()).isEqualTo("요청한 리소스를 찾을 수 없습니다.");
        assertThat(exception.getErrorCode()).isEqualTo(CommonErrorCode.NOT_FOUND);
    }

    @Test
    @DisplayName("t2 사용자 지정 메시지로 생성한 예외는 해당 메시지를 반환한다")
    void t2_createExceptionWithCustomMessage() {
        BusinessException exception = new BusinessException(CommonErrorCode.BAD_REQUEST, "잘못된 여행 기간입니다.");

        assertThat(exception.getMessage()).isEqualTo("잘못된 여행 기간입니다.");
    }
}
