package back.backend.domain.agent.service;

import back.backend.domain.agent.dto.request.AiItineraryReplanRequest;
import back.backend.domain.agent.dto.request.AiReplanReason;
import back.backend.domain.agent.dto.request.AiReplanScope;
import back.backend.domain.collaboration.service.CollaborationEventService;
import back.backend.domain.itinerary.dto.response.RoutePlanDayResponse;
import back.backend.domain.itinerary.dto.response.RoutePlanItemResponse;
import back.backend.domain.itinerary.dto.response.RoutePlanOption;
import back.backend.domain.itinerary.dto.response.RoutePlanPreviewResponse;
import back.backend.domain.itinerary.entity.ItineraryDay;
import back.backend.domain.itinerary.entity.ItineraryItem;
import back.backend.domain.itinerary.repository.ItineraryDayRepository;
import back.backend.domain.itinerary.service.ItineraryRoutePlanner;
import back.backend.domain.itinerary.service.ItineraryService;
import back.backend.domain.place.entity.Place;
import back.backend.domain.place.entity.PlaceCategory;
import back.backend.domain.place.entity.TripPlace;
import back.backend.domain.place.entity.TripPlaceStatus;
import back.backend.domain.place.repository.TripPlaceRepository;
import back.backend.domain.place.service.PlaceSearchService;
import back.backend.domain.place.service.TripAccessChecker;
import back.backend.domain.trip.entity.Trip;
import back.backend.domain.trip.repository.TripRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

@ExtendWith(MockitoExtension.class)
class AiItineraryReplanServiceTest {

    @Mock TripAccessChecker accessChecker;
    @Mock TripRepository tripRepository;
    @Mock ItineraryDayRepository dayRepository;
    @Mock TripPlaceRepository tripPlaceRepository;
    @Mock ItineraryRoutePlanner routePlanner;
    @Mock ItineraryService itineraryService;
    @Mock AiReplanCutoffPolicy cutoffPolicy;
    @Mock CollaborationEventService collaborationEventService;
    @Mock PlaceSearchService placeSearchService;
    @InjectMocks AiItineraryReplanService replanService;

    @Test
    @DisplayName("t1 하루 재배치 미리보기는 선택한 Day의 장소만 동선 후보로 전달한다")
    void t1_previewSingleDayOnlyPlansPlacesFromSelectedDay() {
        LocalDate today = LocalDate.now();
        Trip trip = Trip.create(
                1L,
                "테스트 여행",
                null,
                Set.of(),
                "서울",
                37.5665,
                126.9780,
                today.minusDays(1),
                today.plusDays(2),
                back.backend.domain.trip.entity.TripVisibility.PRIVATE
        );
        ItineraryDay targetDay = day(11L, today.plusDays(1), 1);
        ItineraryDay otherDay = day(12L, today.plusDays(2), 2);
        TripPlace departurePlace = tripPlace(100L, "출발지");
        TripPlace firstPlace = tripPlace(101L, "첫 장소");
        TripPlace secondPlace = tripPlace(102L, "두 번째 장소");
        TripPlace otherPlace = tripPlace(103L, "다른 Day 장소");
        ItineraryItem departureItem = item(
                200L,
                targetDay,
                departurePlace.getId(),
                0
        );
        ItineraryItem firstItem = item(201L, targetDay, firstPlace.getId(), 0);
        ItineraryItem secondItem = item(202L, targetDay, secondPlace.getId(), 1);
        ItineraryItem otherItem = item(203L, otherDay, otherPlace.getId(), 0);
        targetDay.updateDeparture(
                "TRIP_PLACE",
                "출발지",
                new BigDecimal("37.5665"),
                new BigDecimal("126.9780"),
                departurePlace.getId()
        );
        ReflectionTestUtils.setField(
                targetDay,
                "items",
                new ArrayList<>(List.of(
                        departureItem,
                        firstItem,
                        secondItem
                ))
        );
        ReflectionTestUtils.setField(
                otherDay,
                "items",
                new ArrayList<>(List.of(otherItem))
        );
        RoutePlanPreviewResponse preview = new RoutePlanPreviewResponse(
                "선택 Day 재배치",
                2,
                0,
                List.of(new RoutePlanDayResponse(
                        targetDay.getId(),
                        targetDay.getDayNumber(),
                        targetDay.getItineraryDate(),
                        0,
                        List.of(
                                routeItem(firstPlace.getId(), "첫 장소"),
                                routeItem(secondPlace.getId(), "두 번째 장소")
                        )
                ))
        );
        given(tripRepository.findById(1L)).willReturn(Optional.of(trip));
        given(dayRepository.findAllWithItemsByTripId(1L))
                .willReturn(List.of(targetDay, otherDay));
        given(tripPlaceRepository.findAllOrderedByTripId(1L))
                .willReturn(List.of(
                        departurePlace,
                        firstPlace,
                        secondPlace,
                        otherPlace
                ));
        given(cutoffPolicy.isTripInProgress(any(), any(), any()))
                .willReturn(true);
        given(cutoffPolicy.movableItemIdsForDay(any(), any(), any()))
                .willReturn(Set.of(firstItem.getId(), secondItem.getId()));
        given(cutoffPolicy.isFixed(any(), any(), any())).willReturn(false);
        given(routePlanner.planMulti(any(), any(), any(), any(), any()))
                .willReturn(List.of(new RoutePlanOption("AI 추천 코스", preview)));

        List<RoutePlanOption> result = replanService.preview(
                1L,
                new AiItineraryReplanRequest(
                        AiReplanScope.SINGLE_DAY,
                        targetDay.getId(),
                        null,
                        List.of(AiReplanReason.ROUTE_OPTIMIZATION)
                )
        );

        assertThat(result).hasSize(1);
        assertThat(result.getFirst().plan().days().getFirst().items())
                .extracting(RoutePlanItemResponse::tripPlaceId)
                .containsExactly(firstPlace.getId(), secondPlace.getId());
        then(routePlanner).should().planMulti(
                argThat(days -> days.size() == 1
                        && days.getFirst().getId().equals(targetDay.getId())),
                argThat(places -> places.stream()
                        .map(TripPlace::getId)
                        .toList()
                        .equals(List.of(firstPlace.getId(), secondPlace.getId()))),
                any(),
                any(),
                any()
        );
    }

    private ItineraryDay day(Long id, LocalDate date, int dayNumber) {
        ItineraryDay day = ItineraryDay.create(1L, date, dayNumber);
        ReflectionTestUtils.setField(day, "id", id);
        ReflectionTestUtils.setField(day, "items", new ArrayList<>());
        return day;
    }

    private ItineraryItem item(
            Long id,
            ItineraryDay day,
            Long tripPlaceId,
            int sortOrder
    ) {
        ItineraryItem item = ItineraryItem.create(day, tripPlaceId, sortOrder);
        ReflectionTestUtils.setField(item, "id", id);
        return item;
    }

    private TripPlace tripPlace(Long id, String name) {
        TripPlace tripPlace = TripPlace.builder()
                .tripId(1L)
                .place(Place.builder()
                        .googlePlaceId("google-" + id)
                        .name(name)
                        .address("서울")
                        .latitude(new BigDecimal("37.5665"))
                        .longitude(new BigDecimal("126.9780"))
                        .build())
                .category(org.mockito.Mockito.mock(PlaceCategory.class))
                .addedBy(1L)
                .status(TripPlaceStatus.SAVED)
                .build();
        ReflectionTestUtils.setField(tripPlace, "id", id);
        return tripPlace;
    }

    private RoutePlanItemResponse routeItem(Long tripPlaceId, String name) {
        return new RoutePlanItemResponse(
                tripPlaceId,
                name,
                "관광",
                "#f97316",
                "09:00",
                "10:00",
                null,
                null,
                null,
                null,
                "추천"
        );
    }
}
