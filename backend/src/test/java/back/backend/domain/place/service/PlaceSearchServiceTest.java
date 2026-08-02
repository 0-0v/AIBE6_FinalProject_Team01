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
import java.time.LocalTime;
import java.time.LocalDateTime;
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
                      "primaryType": "tourist_attraction",
                      "types": ["point_of_interest", "tourist_attraction"],
                      "photos": []
                    }
                  ]
                }
                """;

        server.expect(requestTo(org.hamcrest.Matchers.containsString("/places:searchText")))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header(
                        "X-Goog-FieldMask",
                        "places.id,places.displayName,places.formattedAddress,places.location," +
                        "places.primaryType,places.types," +
                        "places.rating,places.userRatingCount," +
                        "places.currentOpeningHours.openNow"
                ))
                .andExpect(header("X-Goog-Api-Key", "test-api-key"))
                .andRespond(withSuccess(responseJson, MediaType.APPLICATION_JSON));

        List<PlaceSearchResponse> result = service.search("카멜리아힐");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).googlePlaceId()).isEqualTo("ChIJxxx");
        assertThat(result.get(0).name()).isEqualTo("카멜리아힐");
        assertThat(result.get(0).address()).isEqualTo("제주특별자치도 서귀포시 안덕면 병악로 166");
        assertThat(result.get(0).latitude()).isEqualTo(33.291);
        assertThat(result.get(0).longitude()).isEqualTo(126.373);
        assertThat(result.get(0).placeType()).isEqualTo("tourist_attraction");
        assertThat(result.get(0).photoName()).isNull();
        server.verify();
    }

    @Test
    @DisplayName("t7 장소 검색은 사진 리소스를 요청하거나 응답에 보관하지 않는다")
    void t7_searchDoesNotRetainPhotoResource() {
        String responseJson = """
                {"places":[{
                  "id":"ChIJphoto",
                  "displayName":{"text":"벳푸시"},
                  "location":{"latitude":33.2844614,"longitude":131.4907093},
                  "photos":[{"name":"places/ChIJphoto/photos/AWCphoto","widthPx":1200,"heightPx":800}]
                }]}
                """;
        server.expect(requestTo(org.hamcrest.Matchers.containsString("/places:searchText")))
                .andRespond(withSuccess(responseJson, MediaType.APPLICATION_JSON));

        PlaceSearchResponse result = service.search("벳푸").get(0);

        assertThat(result.photoName()).isNull();
        assertThat(result.toString()).doesNotContain("test-api-key");
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

    @Test
    @DisplayName("t5 위치 정보가 없는 장소는 검색 결과에서 제외한다")
    void t5_위치정보가없는장소제외() {
        String responseJson = """
                {
                  "places": [
                    {
                      "id": "ChIJnoLocation",
                      "displayName": {"text": "좌표 없는 장소", "languageCode": "ko"},
                      "formattedAddress": "주소 미상",
                      "types": ["point_of_interest"]
                    }
                  ]
                }
                """;

        server.expect(requestTo(org.hamcrest.Matchers.containsString("/places:searchText")))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess(responseJson, MediaType.APPLICATION_JSON));

        List<PlaceSearchResponse> result = service.search("좌표 없는 장소");

        assertThat(result).isEmpty();
        server.verify();
    }

    @Test
    @DisplayName("t6 로컬 referrer가 설정되면 Google Places API 요청 헤더에 포함한다")
    void t6_로컬Referrer설정시요청헤더포함() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer refererServer = MockRestServiceServer.bindTo(builder).build();
        PlaceSearchService refererService =
                new PlaceSearchService(builder, "test-api-key", "http://localhost:3000/");
        refererServer.expect(requestTo(org.hamcrest.Matchers.containsString("/places:searchText")))
                .andExpect(header("Referer", "http://localhost:3000/"))
                .andRespond(withSuccess("{\"places\":[]}", MediaType.APPLICATION_JSON));

        List<PlaceSearchResponse> result = refererService.search("후쿠오카");

        assertThat(result).isEmpty();
        refererServer.verify();
    }

    @Test
    @DisplayName("t8 도시 유형은 여행 장소 검색 결과에서 제외한다")
    void t8_localityIsExcludedFromSearchResults() {
        String responseJson = """
                {"places":[{
                  "id":"ChIJcity",
                  "displayName":{"text":"오사카시"},
                  "location":{"latitude":34.6937,"longitude":135.5023},
                  "primaryType":"locality",
                  "types":["locality","political"]
                }]}
                """;
        server.expect(requestTo(org.hamcrest.Matchers.containsString("/places:searchText")))
                .andRespond(withSuccess(responseJson, MediaType.APPLICATION_JSON));

        assertThat(service.search("오사카시")).isEmpty();
        server.verify();
    }

    @Test
    @DisplayName("t9 검색 결과에 백엔드가 판별한 추천 카테고리를 포함한다")
    void t9_searchResultContainsRecommendedCategory() {
        String responseJson = """
                {"places":[{
                  "id":"ChIJcastle",
                  "displayName":{"text":"오사카 성"},
                  "location":{"latitude":34.6873,"longitude":135.5262},
                  "primaryType":"castle",
                  "types":["castle","tourist_attraction"]
                }]}
                """;
        server.expect(requestTo(org.hamcrest.Matchers.containsString("/places:searchText")))
                .andRespond(withSuccess(responseJson, MediaType.APPLICATION_JSON));

        PlaceSearchResponse result = service.search("오사카 성").get(0);

        assertThat(result.recommendedCategoryType()).isEqualTo(
                back.backend.domain.place.entity.PlaceCategoryType.ATTRACTION
        );
        assertThat(result.placeTypes()).containsExactly("castle", "tourist_attraction");
        server.verify();
    }

    @Test
    @DisplayName("t10 장소 운영정보 조회 시 영업 상태와 다음 개점·폐점 시각을 반환한다")
    void t10_operationalDetailsContainCurrentGoogleOpeningData() {
        String responseJson = """
                {
                  "id":"ChIJhankyu",
                  "businessStatus":"OPERATIONAL",
                  "currentOpeningHours":{
                    "openNow":false,
                    "nextOpenTime":"2026-08-02T11:00:00+09:00",
                    "nextCloseTime":"2026-08-02T20:00:00+09:00",
                    "weekdayDescriptions":["일요일: 오전 11:00~오후 8:00"],
                    "periods":[{
                      "open":{"date":{"year":2026,"month":8,"day":2},"hour":11,"minute":0},
                      "close":{"date":{"year":2026,"month":8,"day":2},"hour":20,"minute":0}
                    }]
                  }
                }
                """;
        server.expect(requestTo(org.hamcrest.Matchers.containsString("/places/ChIJhankyu")))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header(
                        "X-Goog-FieldMask",
                        org.hamcrest.Matchers.containsString("currentOpeningHours.nextOpenTime")
                ))
                .andRespond(withSuccess(responseJson, MediaType.APPLICATION_JSON));

        var result = service.getOperationalDetails("ChIJhankyu");

        assertThat(result.businessStatus()).isEqualTo("OPERATIONAL");
        assertThat(result.openNow()).isFalse();
        assertThat(result.nextOpenTime().toLocalTime()).isEqualTo(LocalTime.of(11, 0));
        assertThat(result.nextCloseTime().toLocalTime()).isEqualTo(LocalTime.of(20, 0));
        assertThat(result.openingWindows()).singleElement().satisfies(window -> {
            assertThat(window.opensAt()).isEqualTo(LocalDateTime.of(2026, 8, 2, 11, 0));
            assertThat(window.closesAt()).isEqualTo(LocalDateTime.of(2026, 8, 2, 20, 0));
        });
        server.verify();
    }
}
