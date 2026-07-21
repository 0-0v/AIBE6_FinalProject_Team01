package back.backend.domain.place.controller;

import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import back.backend.domain.place.service.TripPlaceService;
import back.backend.global.exception.BusinessException;
import back.backend.global.exception.CommonErrorCode;
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

    @Test
    @DisplayName("t1 인증 정보 없이 여행 장소를 조회하면 401을 반환한다")
    void t1_unauthenticatedRequestReturnsUnauthorized() throws Exception {
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
}
