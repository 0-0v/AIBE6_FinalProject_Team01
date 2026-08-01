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
import java.time.LocalDateTime;

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
    @DisplayName("t1 테스트 기준 시각을 입력하면 해당 시점 이후 일정 미리보기를 반환한다")
    void t1_previewReturnsFutureReplanOptions() throws Exception {
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
                                {"testCutoffAt":"2026-08-03T14:00:00"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].routeLabel")
                        .value("AI 추천 코스"))
                .andExpect(jsonPath("$.data[0].plan.summary")
                        .value("비를 피해 실내 일정부터 배치했어요."));
    }

    @Test
    @DisplayName("t2 기준 시각을 생략해도 서버 현재 시각으로 미리보기를 요청한다")
    void t2_previewAcceptsRequestWithoutTestCutoff() throws Exception {
        given(replanService.preview(eq(1L), any())).willReturn(List.of());

        mockMvc.perform(post("/api/trips/1/itinerary/replan/preview")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk());

        then(replanService).should().preview(eq(1L), any());
    }

    @Test
    @DisplayName("t3 재배치 적용 시 미리보기와 같은 테스트 기준 시각을 전달한다")
    void t3_applyForwardsTestCutoff() throws Exception {
        given(replanService.apply(eq(1L), any(), any())).willReturn(List.of());

        mockMvc.perform(post("/api/trips/1/itinerary/replan/apply")
                        .queryParam("testCutoffAt", "2026-08-03T14:00:00")
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
                any(),
                eq(LocalDateTime.of(2026, 8, 3, 14, 0))
        );
    }
}
