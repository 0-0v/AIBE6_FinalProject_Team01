package back.backend.global.exception;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.dao.DataIntegrityViolationException;

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

    @Test
    @DisplayName("t3 데이터 무결성 충돌이 발생하면 409와 공통 충돌 코드를 반환한다")
    void t3_dataIntegrityViolationReturnsConflict() {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/trips/1/places");

        ResponseEntity<ErrorResponse> response = handler.handleDataIntegrityViolationException(
                new DataIntegrityViolationException("uk_trip_places_trip_place"), request);

        assertThat(response.getStatusCode()).isEqualTo(CommonErrorCode.CONFLICT.getStatus());
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().code()).isEqualTo("COMMON_409");
        assertThat(response.getBody().message()).doesNotContain("uk_trip_places_trip_place");
    }

    @Test
    @DisplayName("t4 예상하지 못한 FK 무결성 오류는 500으로 처리한다")
    void t4_unexpectedForeignKeyViolationReturnsInternalServerError() {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/trips/1/places");

        ResponseEntity<ErrorResponse> response = handler.handleDataIntegrityViolationException(
                new DataIntegrityViolationException("fk_trip_places_trip"), request);

        assertThat(response.getStatusCode()).isEqualTo(CommonErrorCode.INTERNAL_SERVER_ERROR.getStatus());
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().code()).isEqualTo("COMMON_500");
    }
}
