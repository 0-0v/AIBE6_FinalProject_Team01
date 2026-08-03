package back.backend.domain.trip.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import back.backend.domain.card.entity.PlanCard;
import back.backend.domain.card.entity.TripTag;
import back.backend.domain.card.repository.PlanCardRepository;
import back.backend.domain.card.repository.PlanCardTagRepository;
import back.backend.domain.card.repository.TripTagRepository;
import back.backend.domain.collaboration.activitylog.service.ActivityLogService;
import back.backend.domain.place.repository.TripPlaceRepository;
import back.backend.domain.travelrecord.repository.TravelPhotoRepository;
import back.backend.domain.travelrecord.repository.TravelRecordRepository;
import back.backend.domain.trip.dto.TripCompletionConfirmationRequest;
import back.backend.domain.trip.dto.TripVisibilitySettingsResponse;
import back.backend.domain.trip.entity.Trip;
import back.backend.domain.trip.entity.TravelStyle;
import back.backend.domain.trip.entity.TripVisibility;
import back.backend.domain.trip.repository.TripMemberRepository;
import back.backend.domain.trip.repository.TripRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
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
class TripCompletionConfirmationServiceTest {

    @Mock TripRepository tripRepository;
    @Mock TripMemberRepository tripMemberRepository;
    @Mock PlanCardRepository planCardRepository;
    @Mock TripTagRepository tripTagRepository;
    @Mock PlanCardTagRepository planCardTagRepository;
    @Mock TripPlaceRepository tripPlaceRepository;
    @Mock TravelRecordRepository travelRecordRepository;
    @Mock TravelPhotoRepository travelPhotoRepository;
    @Mock ActivityLogService activityLogService;

    @Test
    @DisplayName("t1 여행방 멤버가 종료 여행방을 공개로 확인하면 태그와 카드 공개 범위를 저장한다")
    void t1_confirmPublicCompletionSavesTagsAndVisibility() {
        Trip trip = Trip.create(
                1L, "제주 여행", null, Set.of(), null,
                LocalDate.of(2026, 7, 28), LocalDate.of(2026, 7, 31));
        ReflectionTestUtils.setField(trip, "id", 10L);
        trip.completeAutomatically(LocalDate.of(2026, 8, 1));
        PlanCard card = PlanCard.create(10L, "제주 여행", TripVisibility.PRIVATE, 1L);
        ReflectionTestUtils.setField(card, "id", 20L);
        when(tripRepository.findByIdAndMemberIdAndStatusNot(any(), any(), any()))
                .thenReturn(Optional.of(trip));
        when(planCardRepository.findByTripId(10L)).thenReturn(Optional.of(card));
        when(tripTagRepository.save(any())).thenAnswer(invocation -> {
            TripTag tag = invocation.getArgument(0);
            ReflectionTestUtils.setField(tag, "id", 30L);
            return tag;
        });
        when(tripMemberRepository.countByTripId(10L)).thenReturn(2L);
        Clock clock = Clock.fixed(
                Instant.parse("2026-08-01T01:00:00Z"), ZoneId.of("Asia/Seoul"));
        TripCompletionConfirmationService service = new TripCompletionConfirmationService(
                tripRepository, tripMemberRepository, planCardRepository, tripTagRepository,
                planCardTagRepository, tripPlaceRepository, travelRecordRepository,
                travelPhotoRepository, activityLogService, clock);

        var response = service.confirm(
                1L, 10L,
                new TripCompletionConfirmationRequest(
                        TripVisibility.PUBLIC_ROUTE, List.of("#둘이서"),
                        "친구와 함께한 제주 여행"));

        assertThat(response.visibility()).isEqualTo(TripVisibility.PUBLIC_ROUTE);
        assertThat(response.completionConfirmed()).isTrue();
        assertThat(card.getVisibility()).isEqualTo(TripVisibility.PUBLIC_ROUTE);
        assertThat(card.getSummary()).isEqualTo("친구와 함께한 제주 여행");
        assertThat(trip.getDescription()).isEqualTo("친구와 함께한 제주 여행");
        verify(tripTagRepository).save(any());
        verify(planCardTagRepository).save(any());
        verify(activityLogService).create(any());
    }

    @Test
    @DisplayName("t2 완료 여행방 공개 설정을 조회하면 저장된 태그를 순서대로 반환한다")
    void t2_getSettingsReturnsSavedTags() {
        Trip trip = completedTrip();
        trip.updateDescription("저장된 여행 설명");
        TripTag first = TripTag.create(10L, "친구와", 1L, 0);
        TripTag second = TripTag.create(10L, "액티비티", 1L, 1);
        when(tripRepository.findByIdAndMemberIdAndStatusNot(any(), any(), any()))
                .thenReturn(Optional.of(trip));
        when(tripTagRepository.findAllByTripIdOrderBySortOrderAsc(10L))
                .thenReturn(List.of(first, second));
        TripCompletionConfirmationService service = service();

        TripVisibilitySettingsResponse response = service.getSettings(1L, 10L);

        assertThat(response.visibility()).isEqualTo(TripVisibility.PRIVATE);
        assertThat(response.tags()).containsExactly("친구와", "액티비티");
        assertThat(response.description()).isEqualTo("저장된 여행 설명");
    }

    @Test
    @DisplayName("t3 공개 태그를 다시 저장하면 기존 태그를 제거하고 새 태그로 교체한다")
    void t3_confirmPublicCompletionReplacesExistingTags() {
        Trip trip = completedTrip();
        PlanCard card = PlanCard.create(
                10L, "제주 여행", TripVisibility.PUBLIC_ROUTE, 1L);
        ReflectionTestUtils.setField(card, "id", 20L);
        when(tripRepository.findByIdAndMemberIdAndStatusNot(any(), any(), any()))
                .thenReturn(Optional.of(trip));
        when(planCardRepository.findByTripId(10L)).thenReturn(Optional.of(card));
        when(tripTagRepository.save(any())).thenAnswer(invocation -> {
            TripTag tag = invocation.getArgument(0);
            ReflectionTestUtils.setField(tag, "id", 30L);
            return tag;
        });
        TripCompletionConfirmationService service = service();

        service.confirm(
                1L,
                10L,
                new TripCompletionConfirmationRequest(
                        TripVisibility.PUBLIC_ROUTE, List.of("새로운태그")));

        verify(planCardTagRepository).deleteAllByPlanCardId(20L);
        verify(tripTagRepository).deleteAllByTripId(10L);
        verify(tripTagRepository).save(any());
    }

    @Test
    @DisplayName("t4 여행 스타일이 있으면 직접 입력 태그 없이 공개할 수 있다")
    void t4_confirmPublicCompletionAllowsOnlyTravelStyleTags() {
        Trip trip = Trip.create(
                1L, "제주 여행", null, Set.of(TravelStyle.FOOD), null,
                LocalDate.of(2026, 7, 28), LocalDate.of(2026, 7, 31));
        ReflectionTestUtils.setField(trip, "id", 10L);
        trip.completeAutomatically(LocalDate.of(2026, 8, 1));
        PlanCard card = PlanCard.create(10L, "제주 여행", TripVisibility.PRIVATE, 1L);
        ReflectionTestUtils.setField(card, "id", 20L);
        when(tripRepository.findByIdAndMemberIdAndStatusNot(any(), any(), any()))
                .thenReturn(Optional.of(trip));
        when(planCardRepository.findByTripId(10L)).thenReturn(Optional.of(card));

        service().confirm(1L, 10L, new TripCompletionConfirmationRequest(
                TripVisibility.PUBLIC_ROUTE, List.of(), "맛집 여행"));

        assertThat(card.getVisibility()).isEqualTo(TripVisibility.PUBLIC_ROUTE);
        assertThat(card.getSummary()).isEqualTo("맛집 여행");
    }

    private Trip completedTrip() {
        Trip trip = Trip.create(
                1L, "제주 여행", null, Set.of(), null,
                LocalDate.of(2026, 7, 28), LocalDate.of(2026, 7, 31));
        ReflectionTestUtils.setField(trip, "id", 10L);
        trip.completeAutomatically(LocalDate.of(2026, 8, 1));
        return trip;
    }

    private TripCompletionConfirmationService service() {
        Clock clock = Clock.fixed(
                Instant.parse("2026-08-01T01:00:00Z"),
                ZoneId.of("Asia/Seoul"));
        return new TripCompletionConfirmationService(
                tripRepository, tripMemberRepository, planCardRepository,
                tripTagRepository, planCardTagRepository,
                tripPlaceRepository, travelRecordRepository, travelPhotoRepository,
                activityLogService, clock);
    }
}
