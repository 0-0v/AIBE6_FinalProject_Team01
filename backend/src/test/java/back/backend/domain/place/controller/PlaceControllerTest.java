package back.backend.domain.place.controller;

import static org.hamcrest.Matchers.nullValue;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import back.backend.domain.place.dto.response.PlaceSearchResponse;
import back.backend.domain.place.dto.response.DestinationMetadataResponse;
import back.backend.domain.place.entity.PlaceCategoryType;
import back.backend.domain.place.exception.PlaceErrorCode;
import back.backend.domain.place.service.PlaceSearchService;
import back.backend.domain.place.service.PlacePhotoService;
import back.backend.global.exception.BusinessException;
import back.backend.global.exception.GlobalExceptionHandler;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.http.MediaType;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;

@ExtendWith(MockitoExtension.class)
class PlaceControllerTest {

    private MockMvc mockMvc;

    @Mock
    private PlaceSearchService placeSearchService;
    @Mock
    private PlacePhotoService placePhotoService;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .standaloneSetup(new PlaceController(placeSearchService, placePhotoService))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("t1 유효한 검색어가 있으면 200과 검색 결과 목록을 반환한다")
    void t1_검색성공시200과결과반환() throws Exception {
        List<PlaceSearchResponse> responses = List.of(
                new PlaceSearchResponse(
                        "ChIJxxx", "카멜리아힐",
                        "제주특별자치도 서귀포시 안덕면 병악로 166",
                        33.291, 126.373,
                        "tourist_attraction", List.of("tourist_attraction"),
                        PlaceCategoryType.ATTRACTION, null,
                        null, null, null, null, null, null, null, null, null, null, null
                )
        );
        given(placeSearchService.search("카멜리아힐", null, null, null, null))
                .willReturn(responses);

        mockMvc.perform(get("/api/places/search").param("query", "카멜리아힐"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].googlePlaceId").value("ChIJxxx"))
                .andExpect(jsonPath("$.data[0].name").value("카멜리아힐"))
                .andExpect(jsonPath("$.data[0].placeType").value("tourist_attraction"))
                .andExpect(jsonPath("$.data[0].recommendedCategoryType").value("ATTRACTION"))
                .andExpect(jsonPath("$.data[0].photoName", nullValue()));
    }

    @Test
    @DisplayName("t2 query 파라미터가 빈 문자열이면 400과 PLACE_SEARCH_QUERY_REQUIRED 코드를 반환한다")
    void t2_query파라미터없으면400반환() throws Exception {
        given(placeSearchService.search("", null, null, null, null))
                .willThrow(new BusinessException(PlaceErrorCode.PLACE_SEARCH_QUERY_REQUIRED));

        mockMvc.perform(get("/api/places/search").param("query", ""))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("PLACE_SEARCH_QUERY_REQUIRED"))
                .andExpect(jsonPath("$.message").value("검색어를 입력해주세요."));
    }

    @Test
    @DisplayName("t3 query 파라미터가 누락되면 400을 반환한다")
    void t3_query파라미터누락시400반환() throws Exception {
        given(placeSearchService.search(null, null, null, null, null))
                .willThrow(new BusinessException(PlaceErrorCode.PLACE_SEARCH_QUERY_REQUIRED));

        mockMvc.perform(get("/api/places/search"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("PLACE_SEARCH_QUERY_REQUIRED"))
                .andExpect(jsonPath("$.message").value("검색어를 입력해주세요."));
    }

    @Test
    @DisplayName("t4 유효한 사진 식별자로 요청하면 Google API 키 없이 이미지 바이트를 반환한다")
    void t4_photoProxyReturnsImage() throws Exception {
        String photoName = "places/ChIJphoto/photos/AWCphoto";
        given(placePhotoService.getPhoto(photoName))
                .willReturn(new PlacePhotoService.PhotoContent(
                        new byte[]{1, 2, 3}, MediaType.IMAGE_JPEG));

        mockMvc.perform(get("/api/places/photo").param("name", photoName))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.IMAGE_JPEG))
                .andExpect(content().bytes(new byte[]{1, 2, 3}))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.header()
                        .string("Cache-Control", org.hamcrest.Matchers.containsString("no-store")));
    }

    @Test
    @DisplayName("t5 장소 ID로 사진 메타데이터를 요청하면 최신 사진과 출처 정보를 반환한다")
    void t5_photoMetadataReturnsCurrentPhotoAndAttribution() throws Exception {
        given(placePhotoService.getPhotoMetadata("ChIJphoto"))
                .willReturn(new PlacePhotoService.PhotoMetadata(
                        "places/ChIJphoto/photos/AWCphoto",
                        "https://maps.google.com/photo/source",
                        List.of(new PlacePhotoService.PhotoAuthor(
                                "사진 제공자",
                                "https://maps.google.com/contributor"
                        ))
                ));

        mockMvc.perform(get("/api/places/photo/metadata").param("placeId", "ChIJphoto"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.photoName")
                        .value("places/ChIJphoto/photos/AWCphoto"))
                .andExpect(jsonPath("$.data.googleMapsUri")
                        .value("https://maps.google.com/photo/source"))
                .andExpect(jsonPath("$.data.authorAttributions[0].displayName")
                        .value("사진 제공자"))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.header()
                        .string("Cache-Control", org.hamcrest.Matchers.containsString("no-store")));
    }

    @Test
    @DisplayName("t6 여행지 좌표와 카테고리를 장소 검색 서비스에 전달한다")
    void t6_searchPassesTripCoordinatesAndCategory() throws Exception {
        given(placeSearchService.search(
                "카페", "오사카", "cafe", 34.6937, 135.5023
        )).willReturn(List.of());

        mockMvc.perform(get("/api/places/search")
                        .param("query", "카페")
                        .param("location", "오사카")
                        .param("includedType", "cafe")
                        .param("latitude", "34.6937")
                        .param("longitude", "135.5023"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray());
    }

    @Test
    @DisplayName("t7 장소 ID로 목적지 메타데이터를 요청하면 영문명과 국가 코드를 반환한다")
    void t7_destinationMetadataReturnsEnglishNameAndCountryCode() throws Exception {
        given(placeSearchService.getDestinationMetadata("place-1"))
                .willReturn(new DestinationMetadataResponse("Hwaseong", "KR"));

        mockMvc.perform(get("/api/places/destination-metadata")
                        .param("placeId", "place-1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.englishName").value("Hwaseong"))
                .andExpect(jsonPath("$.data.countryCode").value("KR"));
    }
}
