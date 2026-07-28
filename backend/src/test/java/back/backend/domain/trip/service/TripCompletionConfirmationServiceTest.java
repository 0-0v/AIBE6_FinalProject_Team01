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
import back.backend.domain.trip.dto.TripCompletionConfirmationRequest;
import back.backend.domain.trip.entity.Trip;
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
                planCardTagRepository, activityLogService, clock);

        var response = service.confirm(
                1L, 10L,
                new TripCompletionConfirmationRequest(
                        TripVisibility.PUBLIC, List.of("#둘이서")));

        assertThat(response.visibility()).isEqualTo(TripVisibility.PUBLIC);
        assertThat(response.completionConfirmed()).isTrue();
        assertThat(card.getVisibility()).isEqualTo(TripVisibility.PUBLIC);
        verify(tripTagRepository).save(any());
        verify(planCardTagRepository).save(any());
        verify(activityLogService).create(any());
    }
}
