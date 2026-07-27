package back.backend.domain.trip.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import back.backend.domain.card.entity.PlanCard;
import back.backend.domain.card.entity.TripTag;
import back.backend.domain.card.repository.PlanCardRepository;
import back.backend.domain.card.repository.PlanCardTagRepository;
import back.backend.domain.card.repository.TripTagRepository;
import back.backend.domain.collaboration.activitylog.service.ActivityLogService;
import back.backend.domain.collaboration.notification.service.NotificationService;
import back.backend.domain.trip.entity.CompanionType;
import back.backend.domain.trip.entity.TravelStyle;
import back.backend.domain.trip.entity.Trip;
import back.backend.domain.trip.entity.TripStatus;
import back.backend.domain.trip.repository.TripMemberRepository;
import back.backend.domain.trip.repository.TripRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class TripCompletionServiceTest {

    @Mock TripRepository tripRepository;
    @Mock TripMemberRepository tripMemberRepository;
    @Mock PlanCardRepository planCardRepository;
    @Mock TripTagRepository tripTagRepository;
    @Mock PlanCardTagRepository planCardTagRepository;
    @Mock ActivityLogService activityLogService;
    @Mock NotificationService notificationService;
    private TripCompletionService tripCompletionService;

    @BeforeEach
    void setUp() {
        tripCompletionService = new TripCompletionService(
                tripRepository,
                tripMemberRepository,
                planCardRepository,
                tripTagRepository,
                planCardTagRepository,
                activityLogService,
                notificationService
        );
    }

    @Test
    @DisplayName("t1 종료일이 지난 여행을 자동 완료하면 여행 카드와 분류 태그를 생성한다")
    void t1_completeExpiredTripsCreatesCardAndTags() {
        LocalDate today = LocalDate.of(2026, 8, 1);
        Trip trip = Trip.create(
                1L,
                "제주 여행",
                CompanionType.FRIENDS,
                Set.of(TravelStyle.ACTIVITY),
                "제주도",
                LocalDate.of(2026, 7, 28),
                LocalDate.of(2026, 7, 31)
        );
        ReflectionTestUtils.setField(trip, "id", 10L);
        when(tripRepository.findAllByStatusInAndEndDateBefore(any(), any()))
                .thenReturn(List.of(trip));
        when(planCardRepository.existsByTripId(10L)).thenReturn(false);
        when(planCardRepository.save(any())).thenAnswer(invocation -> {
            PlanCard card = invocation.getArgument(0);
            ReflectionTestUtils.setField(card, "id", 20L);
            return card;
        });
        when(tripTagRepository.save(any())).thenAnswer(invocation -> {
            TripTag tag = invocation.getArgument(0);
            ReflectionTestUtils.setField(tag, "id", 30L);
            return tag;
        });
        when(tripMemberRepository.findMemberIdsByTripId(10L)).thenReturn(List.of(1L, 2L));

        int completedCount = tripCompletionService.completeExpiredTrips(today);

        ArgumentCaptor<TripTag> tagCaptor = ArgumentCaptor.forClass(TripTag.class);
        assertThat(completedCount).isEqualTo(1);
        assertThat(trip.getStatus()).isEqualTo(TripStatus.COMPLETED);
        verify(tripTagRepository, times(2)).save(tagCaptor.capture());
        assertThat(tagCaptor.getAllValues()).extracting(TripTag::getName)
                .containsExactly("친구와", "액티비티");
        verify(planCardTagRepository, times(2)).save(any());
        verify(activityLogService).create(any());
        verify(notificationService, times(2)).create(any());
    }
}
