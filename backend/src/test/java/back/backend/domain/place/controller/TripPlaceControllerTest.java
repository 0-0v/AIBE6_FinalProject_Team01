package back.backend.domain.place.controller;

import back.backend.domain.place.dto.request.AddTripPlaceRequest;
import back.backend.domain.place.dto.response.TripPlaceResponse;
import back.backend.domain.place.entity.TripPlaceStatus;
import back.backend.domain.place.exception.PlaceErrorCode;
import back.backend.domain.place.service.TripPlaceService;
import back.backend.global.exception.BusinessException;
import back.backend.global.exception.GlobalExceptionHandler;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;
import java.math.BigDecimal;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willDoNothing;
import static org.mockito.BDDMockito.willThrow;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class TripPlaceControllerTest {

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Mock
    private TripPlaceService tripPlaceService;

    private TripPlaceResponse sampleResponse;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .standaloneSetup(new TripPlaceController(tripPlaceService))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();

        sampleResponse = new TripPlaceResponse(
                10L, "ChIJxxx", "오설록 티 뮤지엄", "제주 서귀포시 신화역사로 15",
                new BigDecimal("33.3065000"), new BigDecimal("126.2897000"),
                "tourist_attraction", null, null, TripPlaceStatus.SAVED, 1L, 0);
    }

    @Test
    @DisplayName("t1 유효한 장소 추가 요청이면 201 Created와 trip_place 정보를 반환한다")
    void t1_장소추가성공() throws Exception {
        AddTripPlaceRequest request = new AddTripPlaceRequest(
                "ChIJxxx", "오설록 티 뮤지엄", "제주 서귀포시 신화역사로 15",
                33.3065, 126.2897, "tourist_attraction", null);

        given(tripPlaceService.addPlace(eq(1L), any())).willReturn(sampleResponse);

        mockMvc.perform(post("/api/trips/1/places")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.tripPlaceId").value(10))
                .andExpect(jsonPath("$.data.googlePlaceId").value("ChIJxxx"))
                .andExpect(jsonPath("$.data.status").value("SAVED"));
    }

    @Test
    @DisplayName("t2 이미 여행에 추가된 장소를 추가하면 409 Conflict를 반환한다")
    void t2_중복장소추가시409반환() throws Exception {
        AddTripPlaceRequest request = new AddTripPlaceRequest(
                "ChIJxxx", "오설록 티 뮤지엄", "제주 서귀포시 신화역사로 15",
                33.3065, 126.2897, "tourist_attraction", null);

        given(tripPlaceService.addPlace(eq(1L), any()))
                .willThrow(new BusinessException(PlaceErrorCode.TRIP_PLACE_ALREADY_EXISTS));

        mockMvc.perform(post("/api/trips/1/places")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("TRIP_PLACE_ALREADY_EXISTS"));
    }

    @Test
    @DisplayName("t3 필수 필드 누락 시 400 Bad Request를 반환한다")
    void t3_필수필드누락시400반환() throws Exception {
        mockMvc.perform(post("/api/trips/1/places")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("t4 여행방의 전체 장소 목록을 200 OK와 함께 반환한다")
    void t4_전체목록조회성공() throws Exception {
        given(tripPlaceService.getPlaces(1L, null)).willReturn(List.of(sampleResponse));

        mockMvc.perform(get("/api/trips/1/places"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data[0].tripPlaceId").value(10));
    }

    @Test
    @DisplayName("t5 status 파라미터로 필터링된 장소 목록을 반환한다")
    void t5_status필터조회성공() throws Exception {
        given(tripPlaceService.getPlaces(1L, TripPlaceStatus.SAVED))
                .willReturn(List.of(sampleResponse));

        mockMvc.perform(get("/api/trips/1/places").param("status", "SAVED"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].status").value("SAVED"));
    }

    @Test
    @DisplayName("t6 장소 삭제 요청이 성공하면 204 No Content를 반환한다")
    void t6_장소삭제성공() throws Exception {
        willDoNothing().given(tripPlaceService).deletePlace(1L, 10L);

        mockMvc.perform(delete("/api/trips/1/places/10"))
                .andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("t7 존재하지 않는 장소 삭제 요청이면 404 Not Found를 반환한다")
    void t7_존재하지않는장소삭제시404반환() throws Exception {
        willThrow(new BusinessException(PlaceErrorCode.TRIP_PLACE_NOT_FOUND))
                .given(tripPlaceService).deletePlace(1L, 99L);

        mockMvc.perform(delete("/api/trips/1/places/99"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("TRIP_PLACE_NOT_FOUND"));
    }

    @Test
    @DisplayName("t8 지원하지 않는 status 값으로 조회하면 400 Bad Request를 반환한다")
    void t8_잘못된상태값조회시400반환() throws Exception {
        mockMvc.perform(get("/api/trips/1/places").param("status", "INVALID"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("COMMON_400"));
    }

    @Test
    @DisplayName("t9 장소 카테고리를 변경하면 변경된 장소 정보를 반환한다")
    void t9_updateCategoryReturnsUpdatedPlace() throws Exception {
        given(tripPlaceService.updateCategory(1L, 10L, 3L)).willReturn(sampleResponse);

        mockMvc.perform(put("/api/trips/1/places/10/category")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"categoryId\":3}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.tripPlaceId").value(10));
    }

}
