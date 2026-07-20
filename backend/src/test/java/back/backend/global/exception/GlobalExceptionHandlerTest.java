package back.backend.global.exception;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    @DisplayName("t1 비즈니스 예외 발생 시 지정된 HTTP 상태와 에러 코드 및 요청 경로를 반환한다")
    void t1_businessExceptionReturnsDefinedErrorResponse() {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/trips/999");
        BusinessException exception = new BusinessException(CommonErrorCode.NOT_FOUND);

        ResponseEntity<ErrorResponse> response = handler.handleBusinessException(exception, request);

        assertThat(response.getStatusCode()).isEqualTo(CommonErrorCode.NOT_FOUND.getStatus());
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().code()).isEqualTo("COMMON_404");
        assertThat(response.getBody().path()).isEqualTo("/api/trips/999");
    }

    @Test
    @DisplayName("t2 예상하지 못한 예외 발생 시 내부 메시지를 숨기고 공통 서버 오류를 반환한다")
    void t2_unexpectedExceptionHidesInternalMessage() {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/trips");

        ResponseEntity<ErrorResponse> response = handler.handleUnexpectedException(
                new IllegalStateException("database-password-leaked"), request);

        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().message()).isEqualTo("서버 내부 오류가 발생했습니다.");
        assertThat(response.getBody().message()).doesNotContain("database-password-leaked");
    }
}
