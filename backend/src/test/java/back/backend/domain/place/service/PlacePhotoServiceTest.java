package back.backend.domain.place.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import back.backend.domain.place.exception.PlaceErrorCode;
import back.backend.global.exception.BusinessException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

class PlacePhotoServiceTest {

    private MockRestServiceServer server;
    private PlacePhotoService service;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        service = new PlacePhotoService(builder, "test-api-key", "http://localhost:3000/");
    }

    @Test
    @DisplayName("t1 유효한 사진 리소스 이름이면 API 키를 헤더로 전달하고 이미지 바이트를 반환한다")
    void t1_validPhotoNameReturnsImageBytes() {
        server.expect(requestTo(org.hamcrest.Matchers.containsString(
                        "/places/ChIJphoto/photos/AWCphoto/media?maxWidthPx=400")))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header("X-Goog-Api-Key", "test-api-key"))
                .andExpect(header("Referer", "http://localhost:3000/"))
                .andRespond(withSuccess(new byte[]{1, 2, 3}, MediaType.IMAGE_JPEG));

        PlacePhotoService.PhotoContent result =
                service.getPhoto("places/ChIJphoto/photos/AWCphoto");

        assertThat(result.bytes()).containsExactly(1, 2, 3);
        assertThat(result.contentType()).isEqualTo(MediaType.IMAGE_JPEG);
        server.verify();
    }

    @Test
    @DisplayName("t2 허용되지 않은 사진 리소스 이름이면 잘못된 요청 예외가 발생한다")
    void t2_invalidPhotoNameIsRejected() {
        assertThatThrownBy(() -> service.getPhoto("https://evil.example/image"))
                .isInstanceOf(BusinessException.class)
                .satisfies(exception -> assertThat(((BusinessException) exception).getErrorCode())
                        .isEqualTo(PlaceErrorCode.PLACE_PHOTO_NAME_INVALID));
    }
}
