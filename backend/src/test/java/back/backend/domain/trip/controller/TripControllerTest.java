package back.backend.domain.trip.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import back.backend.domain.trip.dto.TripResponse;
import back.backend.domain.trip.dto.TripCompleteResponse;
import back.backend.domain.trip.entity.TripVisibility;
import back.backend.domain.trip.entity.CompanionType;
import back.backend.domain.trip.entity.TravelStyle;
import back.backend.domain.trip.entity.TripStatus;
import back.backend.domain.trip.service.TripService;
import back.backend.global.security.SecurityConfig;
import back.backend.global.security.SecurityContextAccessor;
import back.backend.global.security.jwt.JwtAuthenticationFilter;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(controllers = TripController.class, excludeFilters = @ComponentScan.Filter(
        type = FilterType.ASSIGNABLE_TYPE, classes = {SecurityConfig.class, JwtAuthenticationFilter.class}))
@AutoConfigureMockMvc(addFilters = false)
class TripControllerTest {
    @Autowired MockMvc mockMvc;
    @MockitoBean TripService tripService;
    @MockitoBean SecurityContextAccessor securityContextAccessor;

    @Test
    @DisplayName("t1 인증 회원이 여행방을 생성하면 201 응답을 반환한다")
    void t1_createTripReturnsCreatedResponse() throws Exception {
        when(securityContextAccessor.getCurrentMemberId()).thenReturn(1L);
        when(tripService.create(any(), any())).thenReturn(response());

        mockMvc.perform(post("/api/trips").contentType("application/json").content("""
                {"title":"제주 여행","companionType":"FRIENDS","travelStyles":["FOOD"]}
                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.title").value("제주 여행"));
    }

    @Test
    @DisplayName("t2 여행방 이름이 공백이면 400 응답을 반환한다")
    void t2_createTripRejectsBlankTitle() throws Exception {
        mockMvc.perform(post("/api/trips").contentType("application/json").content("""
                {"title":" "}
                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("t3 인증 회원이 본인 여행방 목록을 조회하면 성공 응답을 반환한다")
    void t3_getMyTripsReturnsList() throws Exception {
        when(securityContextAccessor.getCurrentMemberId()).thenReturn(1L);
        when(tripService.getMyTrips(1L)).thenReturn(List.of(response()));

        mockMvc.perform(get("/api/trips"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].id").value(10));
    }

    @Test
    @DisplayName("t4 소유자가 여행방 완료 정보와 태그를 요청하면 여행 카드 결과를 반환한다")
    void t4_completeTripReturnsCreatedCard() throws Exception {
        when(securityContextAccessor.getCurrentMemberId()).thenReturn(1L);
        when(tripService.complete(any(), any(), any()))
                .thenReturn(new TripCompleteResponse(10L, 20L, TripVisibility.PUBLIC, List.of("친구와")));

        mockMvc.perform(post("/api/trips/{tripId}/complete", 10L)
                        .contentType("application/json")
                        .content("""
                                {"visibility":"PUBLIC","tags":["친구와"]}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.cardId").value(20))
                .andExpect(jsonPath("$.data.tags[0]").value("친구와"));
    }

    private TripResponse response() {
        return new TripResponse(10L, 1L, "제주 여행", CompanionType.FRIENDS,
                Set.of(TravelStyle.FOOD), null, null, null, TripStatus.PLANNING, null, null);
    }
}
