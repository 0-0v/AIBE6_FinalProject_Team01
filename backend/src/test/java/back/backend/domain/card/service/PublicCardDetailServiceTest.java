package back.backend.domain.card.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import back.backend.domain.card.entity.PlanCard;
import back.backend.domain.card.repository.PlanCardRepository;
import back.backend.domain.itinerary.entity.ItineraryDay;
import back.backend.domain.itinerary.repository.ItineraryDayRepository;
import back.backend.domain.member.entity.AuthProvider;
import back.backend.domain.member.entity.Member;
import back.backend.domain.member.repository.MemberRepository;
import back.backend.domain.place.entity.Place;
import back.backend.domain.place.entity.TripPlace;
import back.backend.domain.place.repository.TripPlaceRepository;
import back.backend.domain.travelrecord.entity.TravelPhoto;
import back.backend.domain.travelrecord.entity.TravelRecord;
import back.backend.domain.travelrecord.repository.TravelPhotoRepository;
import back.backend.domain.travelrecord.repository.TravelRecordRepository;
import back.backend.domain.trip.entity.Trip;
import back.backend.domain.trip.entity.TripVisibility;
import back.backend.domain.trip.repository.TripRepository;
import back.backend.global.exception.BusinessException;
import java.time.LocalDate;
import java.time.LocalDateTime;
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
    @Mock TravelRecordRepository travelRecordRepository;
    @Mock TravelPhotoRepository travelPhotoRepository;
    @Mock MemberRepository memberRepository;

    private PublicCardDetailService service() {
        return new PublicCardDetailService(
                cardRepository, tripRepository, dayRepository, tripPlaceRepository,
                travelRecordRepository, travelPhotoRepository, memberRepository);
    }

    @Test
    @DisplayName("t1 루트만 공개 카드는 여행 정보와 일정만 조회하고 기록은 비어 있다")
    void t1_getDetailReturnsPublicTripAndItinerary() {
        PlanCard card = PlanCard.create(10L, "제주 여행", TripVisibility.PUBLIC_ROUTE, 1L);
        ReflectionTestUtils.setField(card, "id", 20L);
        Trip trip = Trip.create(
                1L, "제주 여행", null, Set.of(), "제주",
                LocalDate.of(2026, 8, 1), LocalDate.of(2026, 8, 3),
                TripVisibility.PUBLIC_ROUTE);
        ReflectionTestUtils.setField(trip, "id", 10L);
        ItineraryDay day = ItineraryDay.create(10L, LocalDate.of(2026, 8, 1), 1);

        when(cardRepository.findById(20L)).thenReturn(Optional.of(card));
        when(tripRepository.findById(10L)).thenReturn(Optional.of(trip));
        when(dayRepository.findAllWithItemsByTripId(10L)).thenReturn(List.of(day));
        when(tripPlaceRepository.findAllOrderedByTripId(10L)).thenReturn(List.of());

        var result = service().getDetail(20L);

        assertThat(result.cardId()).isEqualTo(20L);
        assertThat(result.title()).isEqualTo("제주 여행");
        assertThat(result.destination()).isEqualTo("제주");
        assertThat(result.startDate()).isEqualTo(LocalDate.of(2026, 8, 1));
        assertThat(result.visibility()).isEqualTo(TripVisibility.PUBLIC_ROUTE);
        assertThat(result.itinerary()).hasSize(1);
        assertThat(result.records()).isEmpty();
    }

    @Test
    @DisplayName("t2 비공개 카드는 상세 조회할 수 없다")
    void t2_getDetailRejectsPrivateCard() {
        PlanCard card = PlanCard.create(10L, "비공개 여행", TripVisibility.PRIVATE, 1L);
        ReflectionTestUtils.setField(card, "id", 20L);
        when(cardRepository.findById(20L)).thenReturn(Optional.of(card));

        assertThatThrownBy(() -> service().getDetail(20L))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("t3 기록까지 공개 카드는 사진과 메모를 포함한 여행 기록을 함께 반환한다")
    void t3_getDetailIncludesRecordsWhenPublicRecord() {
        PlanCard card = PlanCard.create(10L, "제주 여행", TripVisibility.PUBLIC_RECORD, 1L);
        ReflectionTestUtils.setField(card, "id", 20L);
        Trip trip = Trip.create(
                1L, "제주 여행", null, Set.of(), "제주",
                LocalDate.of(2026, 8, 1), LocalDate.of(2026, 8, 3),
                TripVisibility.PUBLIC_RECORD);
        ReflectionTestUtils.setField(trip, "id", 10L);

        Place place = Place.builder().id(100L).name("성산일출봉").address("제주 서귀포시 성산읍").build();
        TripPlace tripPlace = TripPlace.builder().id(1L).tripId(10L).place(place).build();
        TravelRecord record = TravelRecord.builder()
                .placeId(100L)
                .recordedBy(1L)
                .visitedAt(LocalDateTime.of(2026, 8, 1, 10, 0))
                .memo("일출이 멋졌어요")
                .build();
        ReflectionTestUtils.setField(record, "id", 200L);
        TravelPhoto photo = TravelPhoto.builder()
                .travelRecordId(200L)
                .uploadedBy(1L)
                .imageUrl("/images/sunrise.jpg")
                .sortOrder(0)
                .build();
        Member member = Member.create("traveler@example.com", "가나디", null, AuthProvider.LOCAL, "traveler@example.com");
        ReflectionTestUtils.setField(member, "id", 1L);

        when(cardRepository.findById(20L)).thenReturn(Optional.of(card));
        when(tripRepository.findById(10L)).thenReturn(Optional.of(trip));
        when(dayRepository.findAllWithItemsByTripId(10L)).thenReturn(List.of());
        when(tripPlaceRepository.findAllOrderedByTripId(10L)).thenReturn(List.of(tripPlace));
        when(travelRecordRepository.findAllByTripIdOrderByVisitedAtDescIdDesc(10L)).thenReturn(List.of(record));
        when(travelPhotoRepository.findAllByTravelRecordIdInOrderBySortOrderAsc(List.of(200L)))
                .thenReturn(List.of(photo));
        when(memberRepository.findAllById(List.of(1L))).thenReturn(List.of(member));

        var result = service().getDetail(20L);

        assertThat(result.records()).hasSize(1);
        assertThat(result.visibility()).isEqualTo(TripVisibility.PUBLIC_RECORD);
        assertThat(result.records().get(0).tripPlaceId()).isEqualTo(1L);
        assertThat(result.records().get(0).placeName()).isEqualTo("성산일출봉");
        assertThat(result.records().get(0).address()).isEqualTo("제주 서귀포시 성산읍");
        assertThat(result.records().get(0).memo()).isEqualTo("일출이 멋졌어요");
        assertThat(result.records().get(0).imageUrls()).containsExactly("/images/sunrise.jpg");
        assertThat(result.records().get(0).recordedByNickname()).isEqualTo("가나디");
    }
}
