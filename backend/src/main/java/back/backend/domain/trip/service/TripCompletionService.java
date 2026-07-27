package back.backend.domain.trip.service;

import back.backend.domain.card.entity.PlanCard;
import back.backend.domain.card.repository.PlanCardRepository;
import back.backend.domain.collaboration.activitylog.dto.ActivityLogCreateCommand;
import back.backend.domain.collaboration.activitylog.service.ActivityLogService;
import back.backend.domain.collaboration.notification.dto.NotificationCreateCommand;
import back.backend.domain.collaboration.notification.entity.NotificationType;
import back.backend.domain.collaboration.notification.service.NotificationService;
import back.backend.domain.trip.entity.Trip;
import back.backend.domain.trip.entity.TripStatus;
import back.backend.domain.trip.repository.TripMemberRepository;
import back.backend.domain.trip.repository.TripRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TripCompletionService {

    private static final Set<TripStatus> ACTIVE_STATUSES = Set.of(
            TripStatus.PLANNING,
            TripStatus.CONFIRMED,
            TripStatus.IN_PROGRESS
    );

    private final TripRepository tripRepository;
    private final TripMemberRepository tripMemberRepository;
    private final PlanCardRepository planCardRepository;
    private final ActivityLogService activityLogService;
    private final NotificationService notificationService;

    public TripCompletionService(
            TripRepository tripRepository,
            TripMemberRepository tripMemberRepository,
            PlanCardRepository planCardRepository,
            ActivityLogService activityLogService,
            NotificationService notificationService
    ) {
        this.tripRepository = tripRepository;
        this.tripMemberRepository = tripMemberRepository;
        this.planCardRepository = planCardRepository;
        this.activityLogService = activityLogService;
        this.notificationService = notificationService;
    }

    @Transactional
    public int completeExpiredTrips(LocalDate today) {
        List<Trip> expiredTrips =
                tripRepository.findAllByStatusInAndEndDateBefore(ACTIVE_STATUSES, today);
        expiredTrips.forEach(trip -> complete(trip, today));
        return expiredTrips.size();
    }

    private void complete(Trip trip, LocalDate today) {
        trip.completeAutomatically(today);
        if (!planCardRepository.existsByTripId(trip.getId())) {
            PlanCard card = planCardRepository.save(PlanCard.create(
                    trip.getId(),
                    trip.getTitle(),
                    back.backend.domain.trip.entity.TripVisibility.PRIVATE,
                    trip.getOwnerId()
            ));
        }
        recordCompletion(trip);
    }

    private void recordCompletion(Trip trip) {
        String description = "여행 기간이 종료되어 여행방과 여행 카드가 자동으로 완료되었습니다.";
        activityLogService.create(new ActivityLogCreateCommand(
                trip.getId(),
                null,
                null,
                "TRIP_AUTO_COMPLETED",
                "TRIP",
                trip.getId(),
                description,
                Map.of("title", trip.getTitle(), "status", trip.getStatus().name())
        ));

        notificationService.create(new NotificationCreateCommand(
                trip.getOwnerId(),
                trip.getId(),
                NotificationType.TRIP,
                "여행방 종료 확인",
                "여행 기간이 종료되었습니다. 여행방 공개 여부를 확인해 주세요.",
                "TRIP_COMPLETION_CONFIRMATION",
                trip.getId()
        ));
    }
}
