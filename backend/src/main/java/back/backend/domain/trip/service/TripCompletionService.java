package back.backend.domain.trip.service;

import back.backend.domain.card.entity.PlanCard;
import back.backend.domain.card.entity.PlanCardTag;
import back.backend.domain.card.entity.TripTag;
import back.backend.domain.card.repository.PlanCardRepository;
import back.backend.domain.card.repository.PlanCardTagRepository;
import back.backend.domain.card.repository.TripTagRepository;
import back.backend.domain.collaboration.activitylog.dto.ActivityLogCreateCommand;
import back.backend.domain.collaboration.activitylog.service.ActivityLogService;
import back.backend.domain.collaboration.notification.dto.NotificationCreateCommand;
import back.backend.domain.collaboration.notification.entity.NotificationType;
import back.backend.domain.collaboration.notification.service.NotificationService;
import back.backend.domain.trip.entity.CompanionType;
import back.backend.domain.trip.entity.TravelStyle;
import back.backend.domain.trip.entity.Trip;
import back.backend.domain.trip.entity.TripStatus;
import back.backend.domain.trip.repository.TripMemberRepository;
import back.backend.domain.trip.repository.TripRepository;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashSet;
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
    private final TripTagRepository tripTagRepository;
    private final PlanCardTagRepository planCardTagRepository;
    private final ActivityLogService activityLogService;
    private final NotificationService notificationService;

    public TripCompletionService(
            TripRepository tripRepository,
            TripMemberRepository tripMemberRepository,
            PlanCardRepository planCardRepository,
            TripTagRepository tripTagRepository,
            PlanCardTagRepository planCardTagRepository,
            ActivityLogService activityLogService,
            NotificationService notificationService
    ) {
        this.tripRepository = tripRepository;
        this.tripMemberRepository = tripMemberRepository;
        this.planCardRepository = planCardRepository;
        this.tripTagRepository = tripTagRepository;
        this.planCardTagRepository = planCardTagRepository;
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
                    trip.getVisibility(),
                    trip.getOwnerId()
            ));
            List<String> tags = createTags(trip);
            for (int index = 0; index < tags.size(); index++) {
                TripTag tag = tripTagRepository.save(
                        TripTag.create(trip.getId(), tags.get(index), trip.getOwnerId(), index));
                planCardTagRepository.save(PlanCardTag.create(card.getId(), tag.getId()));
            }
        }
        recordCompletion(trip);
    }

    private List<String> createTags(Trip trip) {
        LinkedHashSet<String> tags = new LinkedHashSet<>();
        if (trip.getCompanionType() != null) {
            tags.add(companionLabel(trip.getCompanionType()));
        }
        trip.getTravelStyles().stream()
                .map(this::styleLabel)
                .forEach(tags::add);
        return new ArrayList<>(tags);
    }

    private String companionLabel(CompanionType companionType) {
        return switch (companionType) {
            case ALONE -> "혼자";
            case FRIENDS -> "친구와";
            case COUPLE -> "연인과";
            case SPOUSE -> "배우자와";
            case CHILDREN -> "아이와";
            case PARENTS -> "부모님과";
        };
    }

    private String styleLabel(TravelStyle travelStyle) {
        return switch (travelStyle) {
            case ACTIVITY -> "액티비티";
            case SNS_HOT_PLACE -> "SNS 핫플레이스";
            case NATURE -> "자연과 함께";
            case FAMOUS_ATTRACTIONS -> "유명관광지 필수";
            case RELAXATION -> "여유롭게 힐링";
            case CULTURE_ART_HISTORY -> "문화·예술·역사";
            case SHOPPING -> "쇼핑";
            case FOOD -> "맛집 먹거리";
        };
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

        List<Long> recipients = tripMemberRepository.findMemberIdsByTripId(trip.getId());
        if (recipients.isEmpty()) {
            recipients = List.of(trip.getOwnerId());
        }
        for (Long recipientId : recipients) {
            notificationService.create(new NotificationCreateCommand(
                    recipientId,
                    trip.getId(),
                    NotificationType.TRIP,
                    "여행 완료 알림",
                    description,
                    "TRIP",
                    trip.getId()
            ));
        }
    }
}
