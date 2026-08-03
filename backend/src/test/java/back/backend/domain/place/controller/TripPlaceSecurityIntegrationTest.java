package back.backend.domain.place.controller;

import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import back.backend.domain.place.service.TripPlaceService;
import back.backend.domain.place.service.PlaceVoteService;
import back.backend.domain.place.service.PlaceCategoryService;
import back.backend.domain.itinerary.service.ItineraryService;
import back.backend.global.exception.BusinessException;
import back.backend.global.exception.CommonErrorCode;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class TripPlaceSecurityIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private TripPlaceService tripPlaceService;

    @MockitoBean
    private PlaceVoteService placeVoteService;

    @MockitoBean
    private PlaceCategoryService placeCategoryService;

    @MockitoBean
    private ItineraryService itineraryService;

    @Test
    @DisplayName("t1 인증 정보 없이 여행 장소를 조회하면 401을 반환한다")
    void t1_unauthenticatedRequestReturnsUnauthorized() throws Exception {
        given(tripPlaceService.getPlaces(1L, null))
                .willThrow(new BusinessException(CommonErrorCode.UNAUTHORIZED));

        mockMvc.perform(get("/api/trips/1/places"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("COMMON_401"));
    }

    @Test
    @DisplayName("t2 인증됐지만 여행 접근 권한이 없으면 403을 반환한다")
    @WithMockUser
    void t2_authenticatedMemberWithoutTripAccessReturnsForbidden() throws Exception {
        given(tripPlaceService.getPlaces(1L, null))
                .willThrow(new BusinessException(CommonErrorCode.FORBIDDEN));

        mockMvc.perform(get("/api/trips/1/places"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("COMMON_403"));
    }

    @Test
    @DisplayName("t3 인증 정보 없이 장소 투표를 신청하면 401을 반환한다")
    void t3_unauthenticatedVoteRequestReturnsUnauthorized() throws Exception {
        mockMvc.perform(post("/api/trips/1/places/10/votes"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("COMMON_401"));
    }

    @Test
    @DisplayName("t4 인증 정보 없이 장소 투표에 응답하면 401을 반환한다")
    void t4_unauthenticatedVoteResponseReturnsUnauthorized() throws Exception {
        mockMvc.perform(put("/api/trips/1/places/10/votes/me")
                        .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                        .content("{\"choice\":\"AGREE\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("COMMON_401"));
    }

    @Test
    @DisplayName("t5 인증 정보 없이 장소 투표 알림을 조회하면 401을 반환한다")
    void t5_unauthenticatedNotificationRequestReturnsUnauthorized() throws Exception {
        mockMvc.perform(get("/api/notifications/place-votes"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("COMMON_401"));
    }

    @Test
    @DisplayName("t6 인증됐지만 여행 멤버가 아니면 투표 신청 시 403을 반환한다")
    @WithMockUser
    void t6_nonMemberVoteRequestReturnsForbidden() throws Exception {
        given(placeVoteService.startVote(1L, 10L))
                .willThrow(new BusinessException(CommonErrorCode.FORBIDDEN));

        mockMvc.perform(post("/api/trips/1/places/10/votes"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("COMMON_403"));
    }

    @Test
    @DisplayName("t7 게스트가 장소 카테고리를 조회하면 200을 반환한다")
    void t7_guestCategoryRequestReturnsOk() throws Exception {
        given(placeCategoryService.getCategories(1L)).willReturn(List.of());

        mockMvc.perform(get("/api/trips/1/categories"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray());
    }

    @Test
    @DisplayName("t8 인증됐지만 여행 멤버가 아니면 카테고리 조회 시 403을 반환한다")
    @WithMockUser
    void t8_nonMemberCategoryRequestReturnsForbidden() throws Exception {
        given(placeCategoryService.getCategories(1L))
                .willThrow(new BusinessException(CommonErrorCode.FORBIDDEN));

        mockMvc.perform(get("/api/trips/1/categories"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("COMMON_403"));
    }

    @Test
    @DisplayName("t9 게스트가 여행 일정을 조회하면 200을 반환한다")
    void t9_guestItineraryRequestReturnsOk() throws Exception {
        given(itineraryService.getItinerary(1L)).willReturn(List.of());

        mockMvc.perform(get("/api/trips/1/itinerary"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray());
    }

    @Test
    @DisplayName("t10 인증 정보 없이 Google 장소를 검색하면 401을 반환한다")
    void t10_unauthenticatedPlaceSearchReturnsUnauthorized() throws Exception {
        mockMvc.perform(get("/api/places/search").param("query", "오사카"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("COMMON_401"));
    }
}
