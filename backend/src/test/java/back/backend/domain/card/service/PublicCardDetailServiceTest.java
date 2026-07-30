package back.backend.domain.card.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import back.backend.domain.card.entity.PlanCard;
import back.backend.domain.card.repository.PlanCardRepository;
import back.backend.domain.itinerary.entity.ItineraryDay;
import back.backend.domain.itinerary.repository.ItineraryDayRepository;
import back.backend.domain.place.repository.TripPlaceRepository;
import back.backend.domain.trip.entity.Trip;
import back.backend.domain.trip.entity.TripVisibility;
import back.backend.domain.trip.repository.TripRepository;
import back.backend.global.exception.BusinessException;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class PublicCardDetailServiceTest {

    @Mock PlanCardRepository cardRepository;
    @Mock TripRepository tripRepository;
    @Mock ItineraryDayRepository dayRepository;
    @Mock TripPlaceRepository tripPlaceRepository;

    @Test
    @DisplayName("t1 공개 카드의 여행 정보와 일정을 조회한다")
    void t1_getDetailReturnsPublicTripAndItinerary() {
        PlanCard card = PlanCard.create(10L, "제주 여행", TripVisibility.PUBLIC, 1L);
        ReflectionTestUtils.setField(card, "id", 20L);
        Trip trip = Trip.create(
                1L, "제주 여행", null, Set.of(), "제주",
                LocalDate.of(2026, 8, 1), LocalDate.of(2026, 8, 3),
                TripVisibility.PUBLIC);
        ReflectionTestUtils.setField(trip, "id", 10L);
        ItineraryDay day = ItineraryDay.create(10L, LocalDate.of(2026, 8, 1), 1);

        when(cardRepository.findById(20L)).thenReturn(Optional.of(card));
        when(tripRepository.findById(10L)).thenReturn(Optional.of(trip));
        when(dayRepository.findAllWithItemsByTripId(10L)).thenReturn(List.of(day));
        when(tripPlaceRepository.findAllOrderedByTripId(10L)).thenReturn(List.of());

        PublicCardDetailService service = new PublicCardDetailService(
                cardRepository, tripRepository, dayRepository, tripPlaceRepository);

        var result = service.getDetail(20L);

        assertThat(result.cardId()).isEqualTo(20L);
        assertThat(result.title()).isEqualTo("제주 여행");
        assertThat(result.destination()).isEqualTo("제주");
        assertThat(result.startDate()).isEqualTo(LocalDate.of(2026, 8, 1));
        assertThat(result.itinerary()).hasSize(1);
    }

    @Test
    @DisplayName("t2 비공개 카드는 상세 조회할 수 없다")
    void t2_getDetailRejectsPrivateCard() {
        PlanCard card = PlanCard.create(10L, "비공개 여행", TripVisibility.PRIVATE, 1L);
        ReflectionTestUtils.setField(card, "id", 20L);
        when(cardRepository.findById(20L)).thenReturn(Optional.of(card));
        PublicCardDetailService service = new PublicCardDetailService(
                cardRepository, tripRepository, dayRepository, tripPlaceRepository);

        assertThatThrownBy(() -> service.getDetail(20L))
                .isInstanceOf(BusinessException.class);
    }
}
