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
import back.backend.domain.place.service.TripAccessChecker;
import back.backend.domain.trip.entity.Trip;
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

    private AiPlaceRecommendationService service;

    @BeforeEach
    void setUp() {
        service = new AiPlaceRecommendationService(
                accessChecker,
                tripRepository,
                itineraryDayRepository,
                tripPlaceRepository,
                placeSearchService
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
        then(accessChecker).should().requireEdit(1L);
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
        return new PlaceSearchResponse(
                googlePlaceId,
                name,
                "오사카",
                latitude,
                longitude,
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
