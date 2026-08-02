package back.backend.domain.itinerary.service;

import back.backend.domain.itinerary.entity.ItineraryDay;
import back.backend.domain.place.entity.Place;
import back.backend.domain.place.entity.PlaceCategory;
import back.backend.domain.place.entity.PlaceCategoryType;
import back.backend.domain.place.entity.PlaceMarkerIcon;
import back.backend.domain.place.entity.TripPlace;
import back.backend.domain.place.entity.TripPlaceStatus;
import back.backend.domain.place.service.PlaceStyleRelationService;
import back.backend.domain.trip.entity.TravelStyle;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import tools.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.mockito.ArgumentCaptor;

@ExtendWith(MockitoExtension.class)
class OpenAiRouteAdvisorTest {

    @Mock
    private OpenAiClient openAiClient;

    @Mock
    private PlaceStyleRelationService placeStyleRelationService;

    private OpenAiRouteAdvisor advisor;

    @BeforeEach
    void setUp() {
        advisor = new OpenAiRouteAdvisor(
                openAiClient,
                new ObjectMapper(),
                placeStyleRelationService
        );
    }

    @Test
    @DisplayName("t1 OpenAI 키가 없으면 외부 호출 없이 추천을 생략한다")
    void t1_unconfiguredClientSkipsRecommendation() {
        when(openAiClient.isConfigured()).thenReturn(false);

        var result = advisor.recommend(
                List.of(day(1L, 1)),
                List.of(tripPlace(10L, "장소 A")),
                Set.of()
        );

        assertThat(result).isEmpty();
        verify(openAiClient, never()).generateStructured(
                anyString(),
                anyString(),
                any()
        );
    }

    @Test
    @DisplayName("t2 유효한 AI 응답은 Day별 장소 ID 순서로 변환한다")
    void t2_validResponseReturnsOrderedPlaceIds() {
        when(openAiClient.isConfigured()).thenReturn(true);
        when(openAiClient.generateStructured(
                anyString(),
                anyString(),
                any()
        )).thenReturn("""
                {
                  "summary": "오전에는 명소, 오후에는 카페를 추천해요.",
                  "dayPlaceIds": [[11, 10], [12]]
                }
                """);

        var result = advisor.recommend(
                List.of(day(1L, 1), day(2L, 2)),
                List.of(
                        tripPlace(10L, "장소 A"),
                        tripPlace(11L, "장소 B"),
                        tripPlace(12L, "장소 C")
                ),
                Set.of(TravelStyle.FOOD)
        );

        assertThat(result).isPresent();
        assertThat(result.orElseThrow().summary())
                .isEqualTo("오전에는 명소, 오후에는 카페를 추천해요.");
        assertThat(result.orElseThrow().tripPlaceIdsByDay())
                .containsExactly(List.of(11L, 10L), List.of(12L));
    }

    @Test
    @DisplayName("t3 장소가 중복되거나 누락된 AI 응답은 폐기한다")
    void t3_duplicateOrMissingPlacesRejectsResponse() {
        when(openAiClient.isConfigured()).thenReturn(true);
        when(openAiClient.generateStructured(
                anyString(),
                anyString(),
                any()
        )).thenReturn("""
                {
                  "summary": "잘못된 추천",
                  "dayPlaceIds": [[10, 10], []]
                }
                """);

        var result = advisor.recommend(
                List.of(day(1L, 1), day(2L, 2)),
                List.of(
                        tripPlace(10L, "장소 A"),
                        tripPlace(11L, "장소 B")
                ),
                Set.of()
        );

        assertThat(result).isEmpty();
    }

    @Test
    @DisplayName("t4 일정 재배치 요청은 장소별 여행 스타일 관계 점수를 AI 문맥에 포함한다")
    void t4_replanIncludesStyleRelationScoresInPrompt() {
        when(openAiClient.isConfigured()).thenReturn(true);
        when(placeStyleRelationService.resolveCompatibilities(any(), any()))
                .thenReturn(Map.of(10L, 0.91));
        when(openAiClient.generateStructured(anyString(), anyString(), any()))
                .thenReturn("""
                        {
                          "summary": "남은 일정을 다시 배치했어요.",
                          "dayPlaceIds": [[10]]
                        }
                        """);
        ArgumentCaptor<String> promptCaptor = ArgumentCaptor.forClass(String.class);

        advisor.recommend(
                List.of(day(1L, 1)),
                List.of(tripPlace(10L, "장소 A")),
                Set.of(TravelStyle.FOOD),
                "REPLAN_REMAINING_ITINERARY"
        );

        verify(openAiClient).generateStructured(
                promptCaptor.capture(),
                anyString(),
                any()
        );
        assertThat(promptCaptor.getValue())
                .contains("styleScore", "0.91", "REPLAN");
    }

    @Test
    @DisplayName("t5 장소 관계 문맥은 반복 키를 제거한 압축 행 형식으로 전달한다")
    void t5_relationContextUsesCompactRows() {
        when(openAiClient.isConfigured()).thenReturn(true);
        when(placeStyleRelationService.resolveCompatibilities(any(), any()))
                .thenReturn(Map.of(10L, 0.82));
        when(openAiClient.generateStructured(anyString(), anyString(), any()))
                .thenReturn("""
                        {
                          "summary": "관계 점수를 반영했어요.",
                          "dayPlaceIds": [[10]]
                        }
                        """);
        ArgumentCaptor<String> promptCaptor = ArgumentCaptor.forClass(String.class);

        advisor.recommend(
                List.of(day(1L, 1)),
                List.of(tripPlace(10L, "장소 A")),
                Set.of(TravelStyle.FOOD)
        );

        verify(openAiClient).generateStructured(
                promptCaptor.capture(),
                anyString(),
                any()
        );
        assertThat(promptCaptor.getValue())
                .contains("placeColumns", "placeRows", "0.82")
                .doesNotContain("\"tripPlaceId\":", "\"status\":");
    }

    @Test
    @DisplayName("t6 날짜별 출발지와 장소 좌표를 AI 동선 문맥에 포함한다")
    void t6_promptIncludesDayDeparturesAndPlaceCoordinates() {
        when(openAiClient.isConfigured()).thenReturn(true);
        when(openAiClient.generateStructured(anyString(), anyString(), any()))
                .thenReturn("""
                        {
                          "summary": "출발지를 반영했어요.",
                          "dayPlaceIds": [[10]]
                        }
                        """);
        ArgumentCaptor<String> promptCaptor = ArgumentCaptor.forClass(String.class);
        ItineraryDay itineraryDay = day(1L, 1);
        itineraryDay.updateDeparture(
                "CUSTOM",
                "숙소",
                BigDecimal.valueOf(37.61),
                BigDecimal.valueOf(127.11),
                null
        );

        advisor.recommend(
                List.of(itineraryDay),
                List.of(tripPlace(10L, "장소 A")),
                Set.of()
        );

        verify(openAiClient).generateStructured(
                promptCaptor.capture(),
                anyString(),
                any()
        );
        assertThat(promptCaptor.getValue())
                .contains(
                        "departureLat",
                        "departureLng",
                        "37.61",
                        "127.11",
                        "latitude",
                        "longitude",
                        "33.451",
                        "126.501"
                );
    }

    private ItineraryDay day(Long id, int number) {
        ItineraryDay day = ItineraryDay.create(
                1L,
                LocalDate.of(2026, 8, number),
                number
        );
        ReflectionTestUtils.setField(day, "id", id);
        return day;
    }

    private TripPlace tripPlace(Long id, String name) {
        Place place = Place.builder()
                .googlePlaceId("google-" + id)
                .name(name)
                .address("테스트 주소")
                .latitude(BigDecimal.valueOf(33.45 + id / 10_000.0))
                .longitude(BigDecimal.valueOf(126.5 + id / 10_000.0))
                .build();
        ReflectionTestUtils.setField(place, "id", id);
        PlaceCategory category = PlaceCategory.builder()
                .name("명소")
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
