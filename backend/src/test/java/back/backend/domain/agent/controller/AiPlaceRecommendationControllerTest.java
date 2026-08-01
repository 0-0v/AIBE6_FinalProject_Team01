package back.backend.domain.agent.controller;

import back.backend.domain.agent.dto.response.AiPlaceRecommendationResponse;
import back.backend.domain.agent.service.AiPlaceRecommendationService;
import back.backend.domain.place.dto.response.PlaceSearchResponse;
import back.backend.domain.place.entity.PlaceCategoryType;
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
class AiPlaceRecommendationControllerTest {

    @Mock
    private AiPlaceRecommendationService recommendationService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(
                        new AiPlaceRecommendationController(
                                recommendationService
                        )
                )
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("t1 카테고리와 사용자 요청을 전달하면 동선 기반 장소 추천을 반환한다")
    void t1_recommendReturnsRouteAwarePlaces() throws Exception {
        given(recommendationService.recommend(eq(1L), any()))
                .willReturn(List.of(new AiPlaceRecommendationResponse(
                        place("google-1", "멘야 라멘"),
                        "기존 동선에서 가까운 라멘 전문점이에요.",
                        320,
                        0.85
                )));

        mockMvc.perform(post("/api/trips/1/ai/place-recommendations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "dayId": 10,
                                  "category": "식사",
                                  "prompt": "진한 돈코츠 라멘을 좋아해",
                                  "limit": 5
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].place.name")
                        .value("멘야 라멘"))
                .andExpect(jsonPath("$.data[0].routeDeviationMeters")
                        .value(320));
    }

    @Test
    @DisplayName("t2 Day 식별자나 카테고리가 없으면 장소 추천 요청을 거절한다")
    void t2_recommendRejectsMissingRequiredFields() throws Exception {
        mockMvc.perform(post("/api/trips/1/ai/place-recommendations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "prompt": "라멘을 좋아해"
                                }
                                """))
                .andExpect(status().isBadRequest());

        then(recommendationService).shouldHaveNoInteractions();
    }

    private PlaceSearchResponse place(String googlePlaceId, String name) {
        return new PlaceSearchResponse(
                googlePlaceId,
                name,
                "오사카",
                34.67,
                135.5,
                "ramen_restaurant",
                List.of("restaurant"),
                PlaceCategoryType.FOOD,
                null,
                4.5,
                100,
                true,
                List.of(),
                null,
                null,
                null,
                null,
                null,
                null,
                null
        );
    }
}
