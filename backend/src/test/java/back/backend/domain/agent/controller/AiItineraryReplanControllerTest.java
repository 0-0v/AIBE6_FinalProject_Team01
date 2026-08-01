package back.backend.domain.agent.controller;

import back.backend.domain.agent.service.AiItineraryReplanService;
import back.backend.domain.itinerary.dto.response.RoutePlanOption;
import back.backend.domain.itinerary.dto.response.RoutePlanPreviewResponse;
import back.backend.global.exception.GlobalExceptionHandler;
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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class AiItineraryReplanControllerTest {

    @Mock
    private AiItineraryReplanService replanService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(
                        new AiItineraryReplanController(replanService)
                )
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("t1 선택한 일정과 재배치 사유를 입력하면 미리보기를 반환한다")
    void t1_previewReturnsOptionsForSelectedItemsAndReasons() throws Exception {
        given(replanService.preview(eq(1L), any())).willReturn(List.of(
                new RoutePlanOption(
                        "AI 추천 코스",
                        new RoutePlanPreviewResponse(
                                "비를 피해 실내 일정부터 배치했어요.",
                                2,
                                1000,
                                List.of()
                        )
                )
        ));

        mockMvc.perform(post("/api/trips/1/itinerary/replan/preview")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"itineraryItemIds":[11,12],"reasons":["WEATHER","BUSINESS_HOURS"]}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].routeLabel")
                        .value("AI 추천 코스"))
                .andExpect(jsonPath("$.data[0].plan.summary")
                        .value("비를 피해 실내 일정부터 배치했어요."));
    }

    @Test
    @DisplayName("t2 재배치할 일정을 선택하지 않으면 잘못된 요청을 반환한다")
    void t2_previewRejectsEmptyItemSelection() throws Exception {
        mockMvc.perform(post("/api/trips/1/itinerary/replan/preview")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"itineraryItemIds\":[],\"reasons\":[\"WEATHER\"]}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("t3 재배치 적용 시 선택한 미리보기 결과를 전달한다")
    void t3_applyForwardsSelectedPreview() throws Exception {
        given(replanService.apply(eq(1L), any())).willReturn(List.of());

        mockMvc.perform(post("/api/trips/1/itinerary/replan/apply")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "summary":"재배치 결과",
                                  "totalPlaceCount":0,
                                  "totalDistanceMeters":0,
                                  "days":[]
                                }
                                """))
                .andExpect(status().isOk());

        then(replanService).should().apply(
                eq(1L),
                any()
        );
    }
}
