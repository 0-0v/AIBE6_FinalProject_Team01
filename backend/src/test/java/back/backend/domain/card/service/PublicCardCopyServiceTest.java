package back.backend.domain.card.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import back.backend.domain.card.dto.CopyItineraryMode;
import back.backend.domain.card.dto.CopyItineraryRequest;
import back.backend.domain.card.entity.PlanCard;
import back.backend.domain.card.repository.PlanCardRepository;
import back.backend.domain.itinerary.entity.ItineraryDay;
import back.backend.domain.itinerary.entity.ItineraryItem;
import back.backend.domain.itinerary.repository.ItineraryDayRepository;
import back.backend.domain.itinerary.repository.ItineraryItemRepository;
import back.backend.domain.place.entity.Place;
import back.backend.domain.place.entity.PlaceCategory;
import back.backend.domain.place.entity.PlaceCategoryType;
import back.backend.domain.place.entity.PlaceMarkerIcon;
import back.backend.domain.place.entity.TripPlace;
import back.backend.domain.place.entity.TripPlaceStatus;
import back.backend.domain.place.repository.TripPlaceRepository;
import back.backend.domain.place.service.PlaceCategoryService;
import back.backend.domain.trip.entity.Trip;
import back.backend.domain.trip.entity.TripStatus;
import back.backend.domain.trip.entity.TripVisibility;
import back.backend.domain.trip.repository.TripRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class PublicCardCopyServiceTest {
    @Mock PlanCardRepository cardRepository;
    @Mock TripRepository tripRepository;
    @Mock TripPlaceRepository tripPlaceRepository;
    @Mock ItineraryDayRepository dayRepository;
    @Mock ItineraryItemRepository itemRepository;
    @Mock PlaceCategoryService categoryService;

    @Test
    @DisplayName("t1 여러 초과 일정이 마지막 날에 합쳐져도 순번을 이어서 담는다")
    void t1_copyClampsOverflowingDaysToTargetLastDay() {
        PublicCardCopyService service = new PublicCardCopyService(
                cardRepository, tripRepository, tripPlaceRepository,
                dayRepository, itemRepository, categoryService);
        PlanCard card = PlanCard.create(100L, "원본", TripVisibility.PUBLIC, 9L);
        ReflectionTestUtils.setField(card, "id", 20L);
        Trip target = Trip.create(
                1L, "대상", null, Set.of(), "도쿄",
                LocalDate.of(2026, 8, 1), LocalDate.of(2026, 8, 2));
        ReflectionTestUtils.setField(target, "id", 200L);
        PlaceCategory category = PlaceCategory.builder()
                .tripId(100L).name("명소").categoryType(PlaceCategoryType.ATTRACTION)
                .markerColor("#000000").markerIcon(PlaceMarkerIcon.LANDMARK).sortOrder(0).build();
        PlaceCategory targetCategory = PlaceCategory.builder()
                .tripId(200L).name("명소").categoryType(PlaceCategoryType.ATTRACTION)
                .markerColor("#000000").markerIcon(PlaceMarkerIcon.LANDMARK).sortOrder(0).build();
        Place place = Place.builder()
                .googlePlaceId("google-1").name("도쿄 타워")
                .latitude(BigDecimal.ONE).longitude(BigDecimal.ONE).build();
        ReflectionTestUtils.setField(place, "id", 300L);
        TripPlace sourcePlace = TripPlace.builder()
                .tripId(100L).place(place).category(category).addedBy(9L)
                .status(TripPlaceStatus.SAVED).build();
        ReflectionTestUtils.setField(sourcePlace, "id", 400L);
        TripPlace targetPlace = TripPlace.builder()
                .tripId(200L).place(place).category(targetCategory).addedBy(1L)
                .status(TripPlaceStatus.SAVED).build();
        ReflectionTestUtils.setField(targetPlace, "id", 500L);
        ItineraryDay sourceDay = ItineraryDay.create(100L, LocalDate.of(2026, 7, 3), 3);
        sourceDay.getItems().add(ItineraryItem.create(sourceDay, 400L, 0));
        ItineraryDay sourceDay4 = ItineraryDay.create(100L, LocalDate.of(2026, 7, 4), 4);
        sourceDay4.getItems().add(ItineraryItem.create(sourceDay4, 400L, 0));
        ItineraryDay targetDay1 = ItineraryDay.create(200L, LocalDate.of(2026, 8, 1), 1);
        ItineraryDay targetDay2 = ItineraryDay.create(200L, LocalDate.of(2026, 8, 2), 2);
        ReflectionTestUtils.setField(targetDay1, "id", 601L);
        ReflectionTestUtils.setField(targetDay2, "id", 602L);

        when(cardRepository.findById(20L)).thenReturn(Optional.of(card));
        when(tripRepository.findByIdAndMemberIdAndStatusNot(200L, 1L, TripStatus.CANCELLED))
                .thenReturn(Optional.of(target));
        when(categoryService.ensureDefaults(200L)).thenReturn(List.of(targetCategory));
        when(tripPlaceRepository.findAllOrderedByTripId(100L)).thenReturn(List.of(sourcePlace));
        when(tripPlaceRepository.findByTripIdAndPlaceId(200L, 300L))
                .thenReturn(Optional.of(targetPlace));
        when(dayRepository.findAllByTripIdOrderByItineraryDateAsc(200L))
                .thenReturn(List.of(targetDay1, targetDay2));
        when(dayRepository.findAllWithItemsByTripId(100L)).thenReturn(List.of(sourceDay, sourceDay4));
        when(itemRepository.findAllByItineraryDayOrderBySortOrderAsc(any())).thenReturn(List.of());

        service.copy(1L, 20L, new CopyItineraryRequest(200L, CopyItineraryMode.APPEND));

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<ItineraryItem>> items = ArgumentCaptor.forClass(List.class);
        verify(itemRepository).saveAll(items.capture());
        assertThat(items.getValue())
                .extracting(
                        item -> item.getItineraryDay().getDayNumber(),
                        ItineraryItem::getSortOrder)
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple(2, 0),
                        org.assertj.core.groups.Tuple.tuple(2, 1));
    }
}
