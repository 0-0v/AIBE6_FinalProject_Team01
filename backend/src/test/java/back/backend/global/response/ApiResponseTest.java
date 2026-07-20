package back.backend.global.response;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class ApiResponseTest {

    @Test
    @DisplayName("t1 데이터가 있는 성공 응답은 성공 상태와 기본 메시지 및 데이터를 반환한다")
    void t1_successResponseReturnsDataAndDefaultMessage() {
        ApiResponse<String> response = ApiResponse.success("result");

        assertThat(response.success()).isTrue();
        assertThat(response.message()).isEqualTo("요청이 성공했습니다.");
        assertThat(response.data()).isEqualTo("result");
    }

    @Test
    @DisplayName("t2 데이터가 없는 성공 응답은 사용자 지정 메시지와 null 데이터를 반환한다")
    void t2_successResponseWithoutDataReturnsCustomMessage() {
        ApiResponse<Void> response = ApiResponse.successMessage("삭제되었습니다.");

        assertThat(response.success()).isTrue();
        assertThat(response.message()).isEqualTo("삭제되었습니다.");
        assertThat(response.data()).isNull();
    }
}
