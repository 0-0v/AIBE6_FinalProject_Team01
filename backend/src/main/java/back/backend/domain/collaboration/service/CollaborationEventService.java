package back.backend.domain.collaboration.service;

import back.backend.domain.collaboration.activitylog.dto.ActivityLogCreateCommand;
import back.backend.domain.collaboration.activitylog.service.ActivityLogService;
import back.backend.domain.collaboration.notification.dto.NotificationCreateCommand;
import back.backend.domain.collaboration.notification.entity.NotificationType;
import back.backend.domain.collaboration.notification.service.NotificationService;
import back.backend.domain.trip.repository.TripMemberRepository;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CollaborationEventService {

    private final ActivityLogService activityLogService;
    private final NotificationService notificationService;
    private final TripMemberRepository tripMemberRepository;

    public CollaborationEventService(
            ActivityLogService activityLogService,
            NotificationService notificationService,
            TripMemberRepository tripMemberRepository
    ) {
        this.activityLogService = activityLogService;
        this.notificationService = notificationService;
        this.tripMemberRepository = tripMemberRepository;
    }

    @Transactional
    public void record(
            Long tripId,
            Long actorId,
            String actionType,
            String targetType,
            Long targetId,
            String description,
            Map<String, Object> metadata,
            NotificationType notificationType,
            String notificationTitle
    ) {
        activityLogService.create(new ActivityLogCreateCommand(
                tripId, actorId, actionType, targetType, targetId, description, metadata));

        Set<Long> recipients = new LinkedHashSet<>(tripMemberRepository.findMemberIdsByTripId(tripId));
        if (recipients.isEmpty() && actorId != null) {
            recipients.add(actorId);
        }
        for (Long recipientId : recipients) {
            notificationService.create(new NotificationCreateCommand(
                    recipientId,
                    tripId,
                    notificationType,
                    notificationTitle,
                    description,
                    targetType,
                    targetId
            ));
        }
    }
}
