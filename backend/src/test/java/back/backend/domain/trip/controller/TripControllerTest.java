package back.backend.domain.trip.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import back.backend.domain.trip.dto.DateAvailabilityResponse;
import back.backend.domain.trip.dto.DateProposalResponse;
import back.backend.domain.trip.dto.TripResponse;
import back.backend.domain.trip.dto.TripVisibilitySettingsResponse;
import back.backend.domain.trip.entity.CompanionType;
import back.backend.domain.trip.entity.TripStatus;
import back.backend.domain.trip.entity.TripVisibility;
import back.backend.domain.trip.entity.TravelStyle;
import back.backend.domain.trip.service.TripService;
import back.backend.domain.trip.service.TripPlanningService;
import back.backend.domain.trip.service.TripCompletionConfirmationService;
import back.backend.global.security.SecurityConfig;
import back.backend.global.security.SecurityContextAccessor;
import back.backend.global.security.jwt.JwtAuthenticationFilter;
import java.time.LocalDate;
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
    @MockitoBean TripPlanningService tripPlanningService;
    @MockitoBean TripCompletionConfirmationService tripCompletionConfirmationService;

    @Test
    @DisplayName("t10 여행방 접속 상태를 갱신하면 성공 응답을 반환한다")
    void t10_markPresentReturnsSuccessResponse() throws Exception {
        mockMvc.perform(post("/api/trips/{tripId}/presence", 10L))
                .andExpect(status().isOk());

        verify(tripService).markPresent(10L);
    }

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
                .andExpect(jsonPath("$.data[0].id").value(10))
                .andExpect(jsonPath("$.data[0].memberCount").value(1));
    }

    @Test
    @DisplayName("t4 여행 멤버가 유효한 날짜 범위를 제안하면 제안 결과를 반환한다")
    void t4_proposeDatesReturnsProposal() throws Exception {
        when(tripPlanningService.propose(any(), any())).thenReturn(new DateProposalResponse(
                30L, java.time.LocalDate.of(2026, 8, 12), java.time.LocalDate.of(2026, 8, 15),
                "OPEN", 0, 0, 2, null));

        mockMvc.perform(put("/api/trips/{tripId}/date-proposal", 10L)
                        .contentType("application/json")
                        .content("""
                                {"startDate":"2026-08-12","endDate":"2026-08-15"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.proposalId").value(30))
                .andExpect(jsonPath("$.data.status").value("OPEN"));
    }

    @Test
    @DisplayName("t5 여행 멤버의 가능 날짜를 조회하면 멤버 정보와 날짜 목록을 반환한다")
    void t5_getDateAvailabilityReturnsMemberHeatmapData() throws Exception {
        when(tripPlanningService.getAvailability(10L)).thenReturn(List.of(
                new DateAvailabilityResponse(
                        1L,
                        "민지",
                        null,
                        List.of(LocalDate.of(2026, 8, 12), LocalDate.of(2026, 8, 13)))));

        mockMvc.perform(get("/api/trips/{tripId}/date-availability", 10L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].memberId").value(1))
                .andExpect(jsonPath("$.data[0].nickname").value("민지"))
                .andExpect(jsonPath("$.data[0].availableDates[0]").value("2026-08-12"));
    }

    @Test
    @DisplayName("t6 소유자가 여행방 공개 범위를 변경하면 변경된 공개 범위를 반환한다")
    void t6_updateVisibilityReturnsUpdatedVisibility() throws Exception {
        when(securityContextAccessor.getCurrentMemberId()).thenReturn(1L);
        when(tripService.updateVisibility(any(), any(), any())).thenReturn(response());

        mockMvc.perform(patch("/api/trips/{tripId}/visibility", 10L)
                        .contentType("application/json")
                        .content("""
                                {"visibility":"PRIVATE"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.visibility").value("PRIVATE"));
    }

    @Test
    @DisplayName("t7 소유자가 종료 여행방을 공개로 확인하면 완료 확인 결과를 반환한다")
    void t7_confirmCompletionReturnsConfirmedTrip() throws Exception {
        when(securityContextAccessor.getCurrentMemberId()).thenReturn(1L);
        when(tripCompletionConfirmationService.confirm(any(), any(), any()))
                .thenReturn(response());

        mockMvc.perform(post("/api/trips/{tripId}/completion-confirmation", 10L)
                        .contentType("application/json")
                        .content("""
                                {"visibility":"PUBLIC_ROUTE","tags":["둘이서"]}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(10));
    }

    @Test
    @DisplayName("t8 인증 회원이 여행방을 나가면 성공 응답을 반환한다")
    void t8_leaveTripReturnsSuccessResponse() throws Exception {
        when(securityContextAccessor.getCurrentMemberId()).thenReturn(1L);

        mockMvc.perform(delete("/api/trips/{tripId}/members/me", 10L))
                .andExpect(status().isOk());

        verify(tripService).leave(1L, 10L);
    }

    @Test
    @DisplayName("t9 완료 여행방 공개 설정을 조회하면 공개 범위와 태그를 반환한다")
    void t9_getVisibilitySettingsReturnsVisibilityAndTags() throws Exception {
        when(securityContextAccessor.getCurrentMemberId()).thenReturn(1L);
        when(tripCompletionConfirmationService.getSettings(1L, 10L))
                .thenReturn(new TripVisibilitySettingsResponse(
                        TripVisibility.PUBLIC_ROUTE,
                        List.of("친구와", "액티비티"), null, 5, 12, 5));

        mockMvc.perform(get("/api/trips/{tripId}/visibility-settings", 10L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.visibility").value("PUBLIC_ROUTE"))
                .andExpect(jsonPath("$.data.tags[0]").value("친구와"))
                .andExpect(jsonPath("$.data.tags[1]").value("액티비티"));
    }

    @Test
    @DisplayName("t10 여행 스타일을 네 개 선택하면 여행방 생성을 거절한다")
    void t10_createTripRejectsMoreThanThreeTravelStyles() throws Exception {
        mockMvc.perform(post("/api/trips")
                        .contentType("application/json")
                        .content("""
                                {
                                  "title":"제주 여행",
                                  "travelStyles":["ACTIVITY","NATURE","SHOPPING","FOOD"]
                                }
                                """))
                .andExpect(status().isBadRequest());
    }

    private TripResponse response() {
        return new TripResponse(10L, 1L, "제주 여행", CompanionType.FRIENDS,
                Set.of(TravelStyle.FOOD), null, null, null, null, 1L,
                TripStatus.PLANNING, TripVisibility.PRIVATE, false, null, null,
                "09:00", "21:00", "NORMAL");
    }
}
