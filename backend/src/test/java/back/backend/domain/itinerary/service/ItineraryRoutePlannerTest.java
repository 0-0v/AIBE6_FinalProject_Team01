package back.backend.domain.itinerary.service;

import back.backend.domain.itinerary.dto.response.RoutePlanPreviewResponse;
import back.backend.domain.itinerary.entity.ItineraryDay;
import back.backend.domain.place.entity.Place;
import back.backend.domain.place.entity.PlaceCategory;
import back.backend.domain.place.entity.PlaceCategoryType;
import back.backend.domain.place.entity.PlaceMarkerIcon;
import back.backend.domain.place.entity.TripPlace;
import back.backend.domain.place.entity.TripPlaceStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import tools.jackson.databind.ObjectMapper;
import java.util.Optional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ItineraryRoutePlannerTest {

    @Mock
    private GeminiClient geminiClient;
    @Mock
    private GoogleDirectionsClient directionsClient;

    private ItineraryRoutePlanner planner;

    @BeforeEach
    void setUp() {
        // Gemini 미설정 상태로 휴리스틱 폴백 테스트
        when(geminiClient.isConfigured()).thenReturn(false);
        // Directions API 미설정 → Haversine 폴백
        when(directionsClient.getRouteInfo(
                anyDouble(), anyDouble(), anyDouble(), anyDouble(), anyString()))
                .thenReturn(Optional.empty());
        planner = new ItineraryRoutePlanner(geminiClient, directionsClient, new ObjectMapper());
    }

    @Test
    @DisplayName("t1 저장 장소를 여행 Day에 균등하게 분배한다")
    void t1_planDistributesSavedPlacesAcrossDays() {
        List<ItineraryDay> days = List.of(day(1L, 1), day(2L, 2));
        List<TripPlace> places = List.of(
                tripPlace(10L, "A", 33.4500, 126.5000),
                tripPlace(11L, "B", 33.4510, 126.5010),
                tripPlace(12L, "C", 33.5000, 126.5500),
                tripPlace(13L, "D", 33.5010, 126.5510)
        );

        RoutePlanPreviewResponse result = planner.plan(days, places);

        assertThat(result.days()).hasSize(2);
        assertThat(result.days()).extracting(day -> day.items().size())
                .containsExactly(2, 2);
        assertThat(result.totalPlaceCount()).isEqualTo(4);
    }

    @Test
    @DisplayName("t2 가까운 장소를 연속 배치하고 한 시간 반 체류 시간을 부여한다")
    void t2_planOrdersNearbyPlacesAndAssignsTimes() {
        List<TripPlace> places = List.of(
                tripPlace(10L, "출발", 33.4500, 126.5000),
                tripPlace(11L, "가까움", 33.4510, 126.5010),
                tripPlace(12L, "멀리", 33.6000, 126.7000)
        );

        RoutePlanPreviewResponse result = planner.plan(
                List.of(day(1L, 1)),
                places
        );

        assertThat(result.days().getFirst().items())
                .extracting(item -> item.placeName())
                .containsExactly("출발", "가까움", "멀리");
        assertThat(result.days().getFirst().items().getFirst().startTime())
                .isEqualTo("09:00");
        assertThat(result.days().getFirst().items().getFirst().endTime())
                .isEqualTo("10:30");
        assertThat(result.days().getFirst().items().getFirst().transportMinutes())
                .isPositive();
    }

    @Test
    @DisplayName("t3 Gemini 호출 실패 시 휴리스틱 알고리즘으로 폴백한다")
    void t3_fallsBackToHeuristicWhenGeminiFails() {
        when(geminiClient.isConfigured()).thenReturn(true);
        when(geminiClient.generateContent(anyString()))
                .thenThrow(new RuntimeException("Gemini API 오류"));

        List<ItineraryDay> days = List.of(day(1L, 1));
        List<TripPlace> places = List.of(
                tripPlace(10L, "A", 33.4500, 126.5000),
                tripPlace(11L, "B", 33.4510, 126.5010)
        );

        RoutePlanPreviewResponse result = planner.plan(days, places);

        // 폴백으로 휴리스틱 결과가 반환되어야 함
        assertThat(result.days()).hasSize(1);
        assertThat(result.days().getFirst().items()).hasSize(2);
        assertThat(result.summary()).contains("가까운 장소끼리 연결");
    }

    @Test
    @DisplayName("t4 Gemini 성공 시 AI 요약과 장소 배치를 반환한다")
    void t4_returnsGeminiPlanWhenGeminiSucceeds() throws Exception {
        when(geminiClient.isConfigured()).thenReturn(true);

        // plan()은 스타일 없이 호출 → 균형 잡힌 코스 1개만 요청
        String geminiJson = """
                {
                  "routes": [
                    {
                      "routeLabel": "균형 잡힌 코스",
                      "summary": "AI가 추천하는 최적 동선입니다.",
                      "days": [
                        {
                          "dayIndex": 0,
                          "places": [
                            {"id": 10, "startTime": "09:00", "endTime": "10:30", "reason": "첫 방문지"},
                            {"id": 11, "startTime": "11:00", "endTime": "12:00", "reason": "근처 카페"}
                          ]
                        }
                      ]
                    }
                  ]
                }
                """;
        when(geminiClient.generateContent(anyString())).thenReturn(geminiJson);

        List<ItineraryDay> days = List.of(day(1L, 1));
        List<TripPlace> places = List.of(
                tripPlace(10L, "경복궁", 37.5796, 126.9770),
                tripPlace(11L, "인왕산카페", 37.5810, 126.9620)
        );

        RoutePlanPreviewResponse result = planner.plan(days, places);

        assertThat(result.summary()).isEqualTo("AI가 추천하는 최적 동선입니다.");
        assertThat(result.days().getFirst().items()).hasSize(2);
        assertThat(result.days().getFirst().items().get(0).placeName()).isEqualTo("경복궁");
        assertThat(result.days().getFirst().items().get(0).startTime()).isEqualTo("09:00");
        assertThat(result.days().getFirst().items().get(0).reason()).isEqualTo("첫 방문지");
    }

    // ── 픽스처 ──────────────────────────────────────────────────────────────

    private ItineraryDay day(Long id, int number) {
        ItineraryDay day = ItineraryDay.create(
                1L,
                LocalDate.of(2026, 8, number),
                number
        );
        ReflectionTestUtils.setField(day, "id", id);
        return day;
    }

    private TripPlace tripPlace(Long id, String name, double lat, double lng) {
        Place place = Place.builder()
                .googlePlaceId("google-" + id)
                .name(name)
                .address("테스트 주소")
                .latitude(BigDecimal.valueOf(lat))
                .longitude(BigDecimal.valueOf(lng))
                .build();
        PlaceCategory category = PlaceCategory.builder()
                .name("관광")
                .tripId(1L)
                .categoryType(PlaceCategoryType.ATTRACTION)
                .markerColor("#f97316")
                .markerIcon(PlaceMarkerIcon.LANDMARK)
                .build();
        TripPlace tripPlace = TripPlace.builder()
                .tripId(1L)
                .place(place)
                .category(category)
                .addedBy(1L)
                .status(TripPlaceStatus.SAVED)
                .build();
        ReflectionTestUtils.setField(tripPlace, "id", id);
        return tripPlace;
    }
}
