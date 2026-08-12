package back.backend.domain.agent.service;

import back.backend.domain.itinerary.service.OpenAiClient;
import back.backend.domain.place.dto.response.PlaceSearchResponse;
import back.backend.domain.place.entity.PlaceCategoryType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

class AiPlaceRecommendationRankerTest {

    @Test
    @DisplayName("t1 LLM 평가는 제공된 후보만 반영하고 점수를 허용 범위로 제한한다")
    void t1_rankAcceptsOnlyCandidateIdsAndClampsScores() {
        OpenAiClient openAiClient = mock(OpenAiClient.class);
        given(openAiClient.isConfigured()).willReturn(true);
        given(openAiClient.generateStructured(
                contains("조용한 음식점"),
                eq("place_recommendation_ranking"),
                any()
        )).willReturn("""
                {"assessments":[
                  {"placeId":"food-1","score":1.4,"reason":"음식점 유형과 사용자 조건에 부합합니다."},
                  {"placeId":"invented","score":1.0,"reason":"존재하지 않는 후보"}
                ]}
                """);
        AiPlaceRecommendationRanker ranker = new AiPlaceRecommendationRanker(
                openAiClient,
                new ObjectMapper()
        );

        var result = ranker.rank(
                "도쿄",
                "restaurant",
                "조용한 음식점",
                List.of(place("food-1"))
        );

        assertThat(result).containsOnlyKeys("food-1");
        assertThat(result.get("food-1").score()).isEqualTo(1.0);
        assertThat(result.get("food-1").reason()).contains("사용자 조건");
    }

    private PlaceSearchResponse place(String id) {
        return new PlaceSearchResponse(
                id, "도쿄 식당", "도쿄도", 35.6, 139.7,
                "restaurant", List.of("restaurant", "food"),
                PlaceCategoryType.FOOD, null, 4.5, 100,
                null, List.of(), null, null, null, null, null, null, null
        );
    }
}
