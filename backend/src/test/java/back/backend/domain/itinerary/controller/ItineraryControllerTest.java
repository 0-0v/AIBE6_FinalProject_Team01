package back.backend.domain.itinerary.controller;

import back.backend.domain.itinerary.dto.request.*;
import back.backend.domain.itinerary.dto.response.ItineraryDayResponse;
import back.backend.domain.itinerary.dto.response.ItineraryItemResponse;
import back.backend.domain.itinerary.dto.response.RoutePlanDayResponse;
import back.backend.domain.itinerary.dto.response.RoutePlanPreviewResponse;
import back.backend.domain.itinerary.entity.ItineraryDayStatus;
import back.backend.domain.itinerary.service.ItineraryService;
import back.backend.global.exception.GlobalExceptionHandler;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.LocalDate;
import java.util.List;

import static org.mockito.BDDMockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class ItineraryControllerTest {

    @Mock ItineraryService itineraryService;
    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper()
            .registerModule(new JavaTimeModule());
    private ItineraryDayResponse dayResponse;
    private ItineraryItemResponse itemResponse;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .standaloneSetup(new ItineraryController(itineraryService))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();

        dayResponse = new ItineraryDayResponse(100L, LocalDate.of(2026, 8, 1), 1, null, "DRAFT", List.of());
        itemResponse = new ItineraryItemResponse(200L, 300L, "테스트 장소", "서울시",
                "음식점", "#dc2626", "UTENSILS", 37.5665, 126.9780,
                null, null, 0, null, null, null);
    }

    @Test
    @DisplayName("t1 여행 일정을 조회하면 200과 day 목록을 반환한다")
    void t1_getItineraryReturns200WithDays() throws Exception {
        given(itineraryService.getItinerary(1L)).willReturn(List.of(dayResponse));

        mockMvc.perform(get("/api/trips/1/itinerary"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].dayNumber").value(1))
                .andExpect(jsonPath("$.data[0].status").value("DRAFT"));
    }

    @Test
    @DisplayName("t2 일정에 장소를 배치하면 200과 업데이트된 Day를 반환한다")
    void t2_addItemReturns200WithUpdatedDay() throws Exception {
        given(itineraryService.addItem(eq(1L), eq(100L), any(AddItineraryItemRequest.class)))
                .willReturn(dayResponse);

        mockMvc.perform(post("/api/trips/1/itinerary/days/100/items")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new AddItineraryItemRequest(300L, 0))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(100));
    }

    @Test
    @DisplayName("t3 일정 항목을 삭제하면 204를 반환한다")
    void t3_removeItemReturns204() throws Exception {
        willDoNothing().given(itineraryService).removeItem(1L, 200L);

        mockMvc.perform(delete("/api/trips/1/itinerary/items/200"))
                .andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("t4 일정 항목을 수정하면 200과 업데이트된 item을 반환한다")
    void t4_updateItemReturns200() throws Exception {
        given(itineraryService.updateItem(eq(1L), eq(200L), any(UpdateItineraryItemRequest.class)))
                .willReturn(itemResponse);

        mockMvc.perform(patch("/api/trips/1/itinerary/items/200")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new UpdateItineraryItemRequest("09:00", "10:00", "메모", 30, 500))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(200));
    }

    @Test
    @DisplayName("t5 일정 항목을 다른 Day로 이동하면 200을 반환한다")
    void t5_moveItemReturns200() throws Exception {
        given(itineraryService.moveItem(eq(1L), eq(200L), any(MoveItineraryItemRequest.class)))
                .willReturn(itemResponse);

        mockMvc.perform(patch("/api/trips/1/itinerary/items/200/move")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new MoveItineraryItemRequest(101L, 0))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(200));
    }

    @Test
    @DisplayName("t6 Day 내 항목 순서를 변경하면 200과 업데이트된 Day를 반환한다")
    void t6_reorderItemsReturns200() throws Exception {
        given(itineraryService.reorderItems(eq(1L), eq(100L), any(ReorderItineraryItemsRequest.class)))
                .willReturn(dayResponse);

        mockMvc.perform(patch("/api/trips/1/itinerary/days/100/items/reorder")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ReorderItineraryItemsRequest(List.of(201L, 200L)))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(100));
    }

    @Test
    @DisplayName("t7 Day 상태를 변경하면 200과 업데이트된 Day를 반환한다")
    void t7_updateDayStatusReturns200() throws Exception {
        ItineraryDayResponse confirmed = new ItineraryDayResponse(100L, LocalDate.of(2026, 8, 1), 1, null, "CONFIRMED", List.of());
        given(itineraryService.updateDayStatus(eq(1L), eq(100L), any(UpdateItineraryDayStatusRequest.class)))
                .willReturn(confirmed);

        mockMvc.perform(patch("/api/trips/1/itinerary/days/100/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new UpdateItineraryDayStatusRequest(ItineraryDayStatus.CONFIRMED))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("CONFIRMED"));
    }

    @Test
    @DisplayName("t8 잘못된 시간 형식으로 항목을 수정하면 400을 반환한다")
    void t8_updateItemRejectsInvalidTimeFormat() throws Exception {
        mockMvc.perform(patch("/api/trips/1/itinerary/items/200")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "startTime": "25:99",
                                  "endTime": "10:00"
                                }
                                """))
                .andExpect(status().isBadRequest());

        then(itineraryService).shouldHaveNoInteractions();
    }

    @Test
    @DisplayName("t9 음수 이동 시간으로 항목을 수정하면 400을 반환한다")
    void t9_updateItemRejectsNegativeTransportMinutes() throws Exception {
        mockMvc.perform(patch("/api/trips/1/itinerary/items/200")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "transportMinutes": -1
                                }
                                """))
                .andExpect(status().isBadRequest());

        then(itineraryService).shouldHaveNoInteractions();
    }

    @Test
    @DisplayName("t10 빈 항목 목록으로 순서를 변경하면 400을 반환한다")
    void t10_reorderItemsRejectsEmptyItemIds() throws Exception {
        mockMvc.perform(patch("/api/trips/1/itinerary/days/100/items/reorder")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"itemIds\":[]}"))
                .andExpect(status().isBadRequest());

        then(itineraryService).shouldHaveNoInteractions();
    }

    @Test
    @DisplayName("t11 잘못된 Day 상태로 변경하면 400을 반환한다")
    void t11_updateDayStatusRejectsInvalidStatus() throws Exception {
        mockMvc.perform(patch("/api/trips/1/itinerary/days/100/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"INVALID\"}"))
                .andExpect(status().isBadRequest());

        then(itineraryService).shouldHaveNoInteractions();
    }

    @Test
    @DisplayName("t12 AI 동선 미리보기를 조회하면 추천 계획을 반환한다")
    void t12_previewRoutePlanReturnsSuggestion() throws Exception {
        given(itineraryService.previewRoutePlan(1L)).willReturn(
                new RoutePlanPreviewResponse(
                        "장소를 가까운 순서로 연결했어요.",
                        2,
                        1500,
                        List.of(new RoutePlanDayResponse(
                                100L,
                                1,
                                LocalDate.of(2026, 8, 1),
                                1500,
                                List.of()
                        ))
                )
        );

        mockMvc.perform(post("/api/trips/1/itinerary/route-plan/preview"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalPlaceCount").value(2))
                .andExpect(jsonPath("$.data.days[0].dayNumber").value(1));
    }

    @Test
    @DisplayName("t13 AI 동선을 승인하면 적용된 일정 목록을 반환한다")
    void t13_applyRoutePlanReturnsUpdatedItinerary() throws Exception {
        RoutePlanPreviewResponse preview = new RoutePlanPreviewResponse(
                "추천 동선",
                0,
                0,
                List.of()
        );
        given(itineraryService.applyRoutePlan(eq(1L), any(RoutePlanPreviewResponse.class)))
                .willReturn(List.of(dayResponse));

        mockMvc.perform(post("/api/trips/1/itinerary/route-plan/apply")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(preview)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].id").value(100));
    }

    @Test
    @DisplayName("t14 일정을 초기화하면 생성된 Day 목록을 반환한다")
    void t14_initializeItineraryReturnsDays() throws Exception {
        given(itineraryService.initializeItinerary(1L)).willReturn(List.of(dayResponse));

        mockMvc.perform(post("/api/trips/1/itinerary/initialize"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].id").value(100));
    }

    @Test
    @DisplayName("t15 AI 계획에 null Day가 포함되면 400을 반환한다")
    void t15_applyRoutePlanRejectsNullDay() throws Exception {
        mockMvc.perform(post("/api/trips/1/itinerary/route-plan/apply")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "summary": "잘못된 계획",
                                  "totalPlaceCount": 1,
                                  "totalDistanceMeters": 0,
                                  "days": [null]
                                }
                                """))
                .andExpect(status().isBadRequest());

        then(itineraryService).shouldHaveNoInteractions();
    }
}
