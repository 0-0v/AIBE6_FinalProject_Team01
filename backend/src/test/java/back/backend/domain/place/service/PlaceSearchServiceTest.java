package back.backend.domain.place.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;

import back.backend.domain.place.dto.response.PlaceSearchResponse;
import back.backend.domain.place.exception.PlaceErrorCode;
import back.backend.global.exception.BusinessException;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

class PlaceSearchServiceTest {

    private MockRestServiceServer server;
    private PlaceSearchService service;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        service = new PlaceSearchService(builder, "test-api-key");
    }

    @Test
    @DisplayName("t1 유효한 검색어로 구글 Places API를 호출하면 PlaceSearchResponse 목록을 반환한다")
    void t1_검색결과반환성공() {
        String responseJson = """
                {
                  "places": [
                    {
                      "id": "ChIJxxx",
                      "displayName": {"text": "카멜리아힐", "languageCode": "ko"},
                      "formattedAddress": "제주특별자치도 서귀포시 안덕면 병악로 166",
                      "location": {"latitude": 33.291, "longitude": 126.373},
                      "types": ["tourist_attraction", "point_of_interest"],
                      "photos": []
                    }
                  ]
                }
                """;

        server.expect(requestTo(org.hamcrest.Matchers.containsString("/places:searchText")))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header(
                        "X-Goog-FieldMask",
                        "places.id,places.displayName,places.formattedAddress,places.location,places.types"
                ))
                .andRespond(withSuccess(responseJson, MediaType.APPLICATION_JSON));

        List<PlaceSearchResponse> result = service.search("카멜리아힐");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).googlePlaceId()).isEqualTo("ChIJxxx");
        assertThat(result.get(0).name()).isEqualTo("카멜리아힐");
        assertThat(result.get(0).address()).isEqualTo("제주특별자치도 서귀포시 안덕면 병악로 166");
        assertThat(result.get(0).latitude()).isEqualTo(33.291);
        assertThat(result.get(0).longitude()).isEqualTo(126.373);
        assertThat(result.get(0).placeType()).isEqualTo("tourist_attraction");
        assertThat(result.get(0).imageUrl()).isNull();
        server.verify();
    }

    @Test
    @DisplayName("t2 검색어가 빈 문자열이면 PLACE_SEARCH_QUERY_REQUIRED 예외가 발생한다")
    void t2_검색어가없으면예외발생() {
        assertThatThrownBy(() -> service.search(""))
                .isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(((BusinessException) e).getErrorCode())
                        .isEqualTo(PlaceErrorCode.PLACE_SEARCH_QUERY_REQUIRED));
    }

    @Test
    @DisplayName("t3 검색어가 null이면 PLACE_SEARCH_QUERY_REQUIRED 예외가 발생한다")
    void t3_null검색어일때예외발생() {
        assertThatThrownBy(() -> service.search(null))
                .isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(((BusinessException) e).getErrorCode())
                        .isEqualTo(PlaceErrorCode.PLACE_SEARCH_QUERY_REQUIRED));
    }

    @Test
    @DisplayName("t4 Google Places API 호출이 실패하면 외부 API 오류로 변환한다")
    void t4_외부API호출실패시비즈니스예외발생() {
        server.expect(requestTo(org.hamcrest.Matchers.containsString("/places:searchText")))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withStatus(HttpStatus.SERVICE_UNAVAILABLE));

        assertThatThrownBy(() -> service.search("카멜리아힐"))
                .isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(((BusinessException) e).getErrorCode())
                        .isEqualTo(PlaceErrorCode.PLACE_SEARCH_EXTERNAL_API_ERROR));
        server.verify();
    }
}
