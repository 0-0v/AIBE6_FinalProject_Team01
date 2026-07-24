package back.backend.domain.place.controller;

import static org.hamcrest.Matchers.nullValue;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import back.backend.domain.place.dto.response.PlaceSearchResponse;
import back.backend.domain.place.exception.PlaceErrorCode;
import back.backend.domain.place.service.PlaceSearchService;
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

@ExtendWith(MockitoExtension.class)
class PlaceControllerTest {

    private MockMvc mockMvc;

    @Mock
    private PlaceSearchService placeSearchService;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .standaloneSetup(new PlaceController(placeSearchService))
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
                        "tourist_attraction", null,
                        null, null, null, null, null, null, null, null, null, null, null
                )
        );
        given(placeSearchService.search("카멜리아힐")).willReturn(responses);

        mockMvc.perform(get("/api/places/search").param("query", "카멜리아힐"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].googlePlaceId").value("ChIJxxx"))
                .andExpect(jsonPath("$.data[0].name").value("카멜리아힐"))
                .andExpect(jsonPath("$.data[0].placeType").value("tourist_attraction"))
                .andExpect(jsonPath("$.data[0].imageUrl", nullValue()));
    }

    @Test
    @DisplayName("t2 query 파라미터가 빈 문자열이면 400과 PLACE_SEARCH_QUERY_REQUIRED 코드를 반환한다")
    void t2_query파라미터없으면400반환() throws Exception {
        given(placeSearchService.search(""))
                .willThrow(new BusinessException(PlaceErrorCode.PLACE_SEARCH_QUERY_REQUIRED));

        mockMvc.perform(get("/api/places/search").param("query", ""))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("PLACE_SEARCH_QUERY_REQUIRED"))
                .andExpect(jsonPath("$.message").value("검색어를 입력해주세요."));
    }

    @Test
    @DisplayName("t3 query 파라미터가 누락되면 400을 반환한다")
    void t3_query파라미터누락시400반환() throws Exception {
        given(placeSearchService.search(null))
                .willThrow(new BusinessException(PlaceErrorCode.PLACE_SEARCH_QUERY_REQUIRED));

        mockMvc.perform(get("/api/places/search"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("PLACE_SEARCH_QUERY_REQUIRED"))
                .andExpect(jsonPath("$.message").value("검색어를 입력해주세요."));
    }
}
