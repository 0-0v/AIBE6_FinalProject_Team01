package back.backend.domain.trip.service;

import back.backend.domain.member.repository.MemberRepository;
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
import back.backend.domain.trip.dto.TripCompleteRequest;
import back.backend.domain.trip.dto.TripCompleteResponse;
import back.backend.domain.trip.dto.TripRequest;
import back.backend.domain.trip.dto.TripResponse;
import back.backend.domain.trip.entity.Trip;
import back.backend.domain.trip.entity.TripMember;
import back.backend.domain.trip.entity.TripStatus;
import back.backend.domain.trip.exception.TripErrorCode;
import back.backend.domain.trip.repository.TripMemberRepository;
import back.backend.domain.trip.repository.TripRepository;
import back.backend.global.exception.BusinessException;
import back.backend.global.exception.CommonErrorCode;
import java.util.List;
import java.util.LinkedHashSet;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class TripService {

    private final TripRepository tripRepository;
    private final TripMemberRepository tripMemberRepository;
    private final MemberRepository memberRepository;
    private final ActivityLogService activityLogService;
    private final NotificationService notificationService;
    private final PlanCardRepository planCardRepository;
    private final TripTagRepository tripTagRepository;
    private final PlanCardTagRepository planCardTagRepository;

    public TripService(TripRepository tripRepository, TripMemberRepository tripMemberRepository,
                       MemberRepository memberRepository,
                       ActivityLogService activityLogService,
                       NotificationService notificationService,
                       PlanCardRepository planCardRepository,
                       TripTagRepository tripTagRepository,
                       PlanCardTagRepository planCardTagRepository) {
        this.tripRepository = tripRepository;
        this.tripMemberRepository = tripMemberRepository;
        this.memberRepository = memberRepository;
        this.activityLogService = activityLogService;
        this.notificationService = notificationService;
        this.planCardRepository = planCardRepository;
        this.tripTagRepository = tripTagRepository;
        this.planCardTagRepository = planCardTagRepository;
    }

    @Transactional
    public TripResponse create(Long memberId, TripRequest request) {
        if (!memberRepository.existsById(memberId)) {
            throw new BusinessException(CommonErrorCode.NOT_FOUND);
        }
        Trip trip = saveValidTrip(memberId, request);
        tripMemberRepository.save(TripMember.owner(trip.getId(), memberId));
        recordEvent(trip, memberId, "TRIP_CREATED", "여행방을 생성했습니다.");
        return toResponse(trip);
    }

    public List<TripResponse> getMyTrips(Long memberId) {
        return tripRepository.findAllAccessibleByMemberIdAndStatusNot(memberId, TripStatus.CANCELLED).stream()
                .map(this::toResponse)
                .toList();
    }

    public TripResponse get(Long memberId, Long tripId) {
        Trip trip = tripRepository.findByIdAndStatusNot(tripId, TripStatus.CANCELLED)
                .orElseThrow(() -> new BusinessException(TripErrorCode.TRIP_NOT_FOUND));
        if (trip.getOwnerId().equals(memberId)
                || tripMemberRepository.existsByTripIdAndMemberId(tripId, memberId)) {
            return toResponse(trip);
        }
        throw new BusinessException(TripErrorCode.TRIP_NOT_FOUND);
    }

    @Transactional
    public TripResponse update(Long memberId, Long tripId, TripRequest request) {
        Trip trip = findOwnedTrip(memberId, tripId);
        try {
            trip.update(request.title(), request.companionType(), request.normalizedTravelStyles(),
                    request.destination(), request.startDate(), request.endDate());
        } catch (IllegalArgumentException exception) {
            throw new BusinessException(TripErrorCode.INVALID_TRIP, exception.getMessage());
        } catch (IllegalStateException exception) {
            throw new BusinessException(TripErrorCode.TRIP_ALREADY_FINISHED);
        }
        recordEvent(trip, memberId, "TRIP_UPDATED", "여행방 정보를 수정했습니다.");
        return toResponse(trip);
    }

    @Transactional
    public void delete(Long memberId, Long tripId) {
        Trip trip = findOwnedTrip(memberId, tripId);
        try {
            trip.cancel();
        } catch (IllegalStateException exception) {
            throw new BusinessException(TripErrorCode.TRIP_ALREADY_FINISHED);
        }
        recordEvent(trip, memberId, "TRIP_DELETED", "여행방을 삭제했습니다.");
    }

    @Transactional
    public TripCompleteResponse complete(Long memberId, Long tripId, TripCompleteRequest request) {
        Trip trip = findOwnedTrip(memberId, tripId);
        if (planCardRepository.existsByTripId(tripId)) {
            throw new BusinessException(TripErrorCode.TRIP_CARD_ALREADY_EXISTS);
        }
        try {
            trip.complete(request.visibility());
        } catch (IllegalStateException exception) {
            throw new BusinessException(TripErrorCode.TRIP_ALREADY_FINISHED);
        }

        PlanCard card = planCardRepository.save(PlanCard.create(tripId, trip.getTitle(), request.visibility(), memberId));
        List<String> tags = normalizeTags(request.tags());
        for (int index = 0; index < tags.size(); index++) {
            TripTag tag = tripTagRepository.save(TripTag.create(tripId, tags.get(index), memberId, index));
            planCardTagRepository.save(PlanCardTag.create(card.getId(), tag.getId()));
        }
        recordEvent(trip, memberId, "TRIP_COMPLETED", "여행방을 완료하고 여행 카드를 생성했습니다.");
        return new TripCompleteResponse(tripId, card.getId(), request.visibility(), tags);
    }

    private Trip saveValidTrip(Long memberId, TripRequest request) {
        try {
            return tripRepository.save(Trip.create(memberId, request.title(), request.companionType(),
                    request.normalizedTravelStyles(), request.destination(), request.startDate(), request.endDate()));
        } catch (IllegalArgumentException exception) {
            throw new BusinessException(TripErrorCode.INVALID_TRIP, exception.getMessage());
        }
    }

    private Trip findOwnedTrip(Long memberId, Long tripId) {
        return tripRepository.findByIdAndOwnerIdAndStatusNot(tripId, memberId, TripStatus.CANCELLED)
                .orElseThrow(() -> new BusinessException(TripErrorCode.TRIP_NOT_FOUND));
    }

    private TripResponse toResponse(Trip trip) {
        return TripResponse.from(trip, tripMemberRepository.countByTripId(trip.getId()));
    }

    private List<String> normalizeTags(List<String> requestedTags) {
        if (requestedTags == null) return List.of();
        LinkedHashSet<String> tags = new LinkedHashSet<>();
        for (String tag : requestedTags) {
            if (tag == null || tag.isBlank()) continue;
            String normalized = tag.trim();
            if (normalized.startsWith("#")) normalized = normalized.substring(1);
            if (!normalized.isBlank()) tags.add(normalized);
        }
        return List.copyOf(tags);
    }

    private void recordEvent(Trip trip, Long actorId, String actionType, String description) {
        activityLogService.create(new ActivityLogCreateCommand(
                trip.getId(), actorId, null, actionType, "TRIP", trip.getId(), description,
                Map.of("title", trip.getTitle(), "status", trip.getStatus().name())));

        List<Long> recipients = tripMemberRepository.findMemberIdsByTripId(trip.getId());
        if (recipients.isEmpty()) recipients = List.of(actorId);
        for (Long recipientId : recipients) {
            notificationService.create(new NotificationCreateCommand(
                    recipientId, trip.getId(), NotificationType.TRIP, "여행방 알림", description, "TRIP", trip.getId()));
        }
    }
}
