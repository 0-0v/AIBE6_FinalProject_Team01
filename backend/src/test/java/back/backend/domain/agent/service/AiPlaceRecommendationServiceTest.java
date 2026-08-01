package back.backend.domain.agent.service;

import back.backend.domain.agent.dto.request.AiPlaceRecommendationRequest;
import back.backend.domain.itinerary.entity.ItineraryDay;
import back.backend.domain.itinerary.entity.ItineraryItem;
import back.backend.domain.itinerary.repository.ItineraryDayRepository;
import back.backend.domain.place.dto.response.PlaceSearchResponse;
import back.backend.domain.place.entity.Place;
import back.backend.domain.place.entity.PlaceCategoryType;
import back.backend.domain.place.entity.TripPlace;
import back.backend.domain.place.repository.TripPlaceRepository;
import back.backend.domain.place.service.PlaceSearchService;
import back.backend.domain.place.service.PlaceStyleRelationService;
import back.backend.domain.place.service.TripAccessChecker;
import back.backend.domain.trip.entity.Trip;
import back.backend.domain.trip.entity.TravelStyle;
import back.backend.domain.trip.repository.TripRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

@ExtendWith(MockitoExtension.class)
class AiPlaceRecommendationServiceTest {

    @Mock TripAccessChecker accessChecker;
    @Mock TripRepository tripRepository;
    @Mock ItineraryDayRepository itineraryDayRepository;
    @Mock TripPlaceRepository tripPlaceRepository;
    @Mock PlaceSearchService placeSearchService;
    @Mock PlaceStyleRelationService placeStyleRelationService;

    private AiPlaceRecommendationService service;

    @BeforeEach
    void setUp() {
        service = new AiPlaceRecommendationService(
                accessChecker,
                tripRepository,
                itineraryDayRepository,
                tripPlaceRepository,
                placeSearchService,
                placeStyleRelationService
        );
    }

    @Test
    @DisplayName("t1 Day 동선 주변 후보를 검색하고 AI가 정렬한 장소만 반환한다")
    void t1_recommendSearchesNearDayRouteAndReturnsAiRanking() {
        Trip trip = org.mockito.Mockito.mock(Trip.class);
        ItineraryDay day = org.mockito.Mockito.mock(ItineraryDay.class);
        ItineraryItem item = org.mockito.Mockito.mock(ItineraryItem.class);
        TripPlace routePlace = tripPlace(100L, "route-place", 34.67, 135.5);
        PlaceSearchResponse candidate = searchPlace(
                "candidate-1",
                "멘야 라멘",
                34.671,
                135.501
        );

        given(trip.getDestination()).willReturn("오사카");
        given(trip.getTravelStyles()).willReturn(Set.of(TravelStyle.FOOD));
        given(tripRepository.findById(1L)).willReturn(Optional.of(trip));
        given(itineraryDayRepository.findByIdAndTripId(10L, 1L))
                .willReturn(Optional.of(day));
        given(day.getItems()).willReturn(List.of(item));
        given(item.getTripPlaceId()).willReturn(100L);
        given(tripPlaceRepository.findAllById(any()))
                .willReturn(List.of(routePlace));
        given(tripPlaceRepository.findAllOrderedByTripId(1L))
                .willReturn(List.of());
        given(placeSearchService.searchNearby(
                contains("오사카 식사"),
                anyDouble(),
                anyDouble(),
                anyDouble()
        )).willReturn(List.of(candidate));
        given(placeStyleRelationService.calculateCompatibility(
                PlaceCategoryType.FOOD,
                Set.of(TravelStyle.FOOD)
        )).willReturn(0.95);
        var result = service.recommend(
                1L,
                new AiPlaceRecommendationRequest(
                        10L,
                        "식사",
                        "라멘을 좋아해",
                        5
                )
        );

        assertThat(result).hasSize(1);
        assertThat(result.get(0).place().googlePlaceId())
                .isEqualTo("candidate-1");
        assertThat(result.get(0).reason()).contains("기존 동선");
        assertThat(result.get(0).routeDeviationMeters()).isPositive();
        assertThat(result.get(0).styleCompatibility()).isEqualTo(0.95);
        then(accessChecker).should().requireEdit(1L);
    }

    @Test
    @DisplayName("t2 동선 차이가 작으면 여행 스타일 적합도가 높은 장소를 먼저 추천한다")
    void t2_styleCompatibilityBreaksSimilarRouteCandidates() {
        Trip trip = org.mockito.Mockito.mock(Trip.class);
        ItineraryDay day = org.mockito.Mockito.mock(ItineraryDay.class);
        ItineraryItem item = org.mockito.Mockito.mock(ItineraryItem.class);
        TripPlace routePlace = tripPlace(100L, "route-place", 34.67, 135.5);
        PlaceSearchResponse food = searchPlace(
                "food", "라멘집", 34.671, 135.501, PlaceCategoryType.FOOD
        );
        PlaceSearchResponse shop = searchPlace(
                "shop", "상점", 34.6711, 135.5011, PlaceCategoryType.SHOPPING
        );

        given(trip.getDestination()).willReturn("오사카");
        given(trip.getTravelStyles()).willReturn(Set.of(TravelStyle.FOOD));
        given(tripRepository.findById(1L)).willReturn(Optional.of(trip));
        given(itineraryDayRepository.findByIdAndTripId(10L, 1L))
                .willReturn(Optional.of(day));
        given(day.getItems()).willReturn(List.of(item));
        given(item.getTripPlaceId()).willReturn(100L);
        given(tripPlaceRepository.findAllById(any())).willReturn(List.of(routePlace));
        given(tripPlaceRepository.findAllOrderedByTripId(1L)).willReturn(List.of());
        given(placeSearchService.searchNearby(anyString(), anyDouble(), anyDouble(), anyDouble()))
                .willReturn(List.of(shop, food));
        given(placeStyleRelationService.calculateCompatibility(
                PlaceCategoryType.FOOD, Set.of(TravelStyle.FOOD)
        )).willReturn(0.95);
        given(placeStyleRelationService.calculateCompatibility(
                PlaceCategoryType.SHOPPING, Set.of(TravelStyle.FOOD)
        )).willReturn(0.1);

        var result = service.recommend(
                1L,
                new AiPlaceRecommendationRequest(10L, "음식점", "라멘", 5)
        );

        assertThat(result).extracting(itemResult -> itemResult.place().googlePlaceId())
                .containsExactly("food", "shop");
    }

    private TripPlace tripPlace(
            Long id,
            String googlePlaceId,
            double latitude,
            double longitude
    ) {
        Place place = org.mockito.Mockito.mock(Place.class);
        TripPlace tripPlace = org.mockito.Mockito.mock(TripPlace.class);
        given(tripPlace.getId()).willReturn(id);
        given(tripPlace.getPlace()).willReturn(place);
        org.mockito.Mockito.lenient()
                .when(place.getGooglePlaceId())
                .thenReturn(googlePlaceId);
        given(place.getLatitude()).willReturn(BigDecimal.valueOf(latitude));
        given(place.getLongitude()).willReturn(BigDecimal.valueOf(longitude));
        return tripPlace;
    }

    private PlaceSearchResponse searchPlace(
            String googlePlaceId,
            String name,
            double latitude,
            double longitude
    ) {
        return searchPlace(
                googlePlaceId,
                name,
                latitude,
                longitude,
                PlaceCategoryType.FOOD
        );
    }

    private PlaceSearchResponse searchPlace(
            String googlePlaceId,
            String name,
            double latitude,
            double longitude,
            PlaceCategoryType categoryType
    ) {
        return new PlaceSearchResponse(
                googlePlaceId,
                name,
                "오사카",
                latitude,
                longitude,
                "ramen_restaurant",
                List.of("restaurant"),
                categoryType,
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
