package back.backend.domain.trip.service;

import back.backend.domain.card.entity.PlanCard;
import back.backend.domain.card.entity.PlanCardTag;
import back.backend.domain.card.entity.TripTag;
import back.backend.domain.card.repository.PlanCardRepository;
import back.backend.domain.card.repository.PlanCardTagRepository;
import back.backend.domain.card.repository.TripTagRepository;
import back.backend.domain.collaboration.activitylog.dto.ActivityLogCreateCommand;
import back.backend.domain.collaboration.activitylog.service.ActivityLogService;
import back.backend.domain.trip.dto.TripCompletionConfirmationRequest;
import back.backend.domain.trip.dto.TripResponse;
import back.backend.domain.trip.entity.Trip;
import back.backend.domain.trip.entity.TripStatus;
import back.backend.domain.trip.entity.TripVisibility;
import back.backend.domain.trip.exception.TripErrorCode;
import back.backend.domain.trip.repository.TripMemberRepository;
import back.backend.domain.trip.repository.TripRepository;
import back.backend.global.exception.BusinessException;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TripCompletionConfirmationService {

    private final TripRepository tripRepository;
    private final TripMemberRepository tripMemberRepository;
    private final PlanCardRepository planCardRepository;
    private final TripTagRepository tripTagRepository;
    private final PlanCardTagRepository planCardTagRepository;
    private final ActivityLogService activityLogService;
    private final Clock clock;

    public TripCompletionConfirmationService(
            TripRepository tripRepository,
            TripMemberRepository tripMemberRepository,
            PlanCardRepository planCardRepository,
            TripTagRepository tripTagRepository,
            PlanCardTagRepository planCardTagRepository,
            ActivityLogService activityLogService,
            Clock clock
    ) {
        this.tripRepository = tripRepository;
        this.tripMemberRepository = tripMemberRepository;
        this.planCardRepository = planCardRepository;
        this.tripTagRepository = tripTagRepository;
        this.planCardTagRepository = planCardTagRepository;
        this.activityLogService = activityLogService;
        this.clock = clock;
    }

    @Transactional
    public TripResponse confirm(Long memberId, Long tripId, TripCompletionConfirmationRequest request) {
        Trip trip = tripRepository.findByIdAndMemberIdAndStatusNot(
                        tripId, memberId, TripStatus.CANCELLED)
                .orElseThrow(() -> new BusinessException(TripErrorCode.TRIP_NOT_FOUND));
        PlanCard card = planCardRepository.findByTripId(tripId)
                .orElseThrow(() -> new BusinessException(TripErrorCode.TRIP_CARD_NOT_FOUND));
        List<String> tags = normalizeTags(request);
        try {
            trip.confirmCompletion(request.visibility(), LocalDateTime.now(clock));
        } catch (IllegalStateException exception) {
            throw new BusinessException(TripErrorCode.INVALID_TRIP, exception.getMessage());
        }
        card.changeVisibility(request.visibility());
        saveTags(trip, card, tags);
        activityLogService.create(new ActivityLogCreateCommand(
                tripId, memberId, null, "TRIP_COMPLETION_CONFIRMED", "TRIP", tripId,
                "여행방 완료와 공개 설정을 확인했습니다.",
                Map.of("visibility", request.visibility().name(), "tags", tags)
        ));
        return TripResponse.from(trip, tripMemberRepository.countByTripId(tripId));
    }

    private List<String> normalizeTags(TripCompletionConfirmationRequest request) {
        if (request.visibility() == TripVisibility.PRIVATE) {
            return List.of();
        }
        LinkedHashSet<String> tags = new LinkedHashSet<>();
        if (request.tags() != null) {
            request.tags().stream()
                    .filter(tag -> tag != null && !tag.isBlank())
                    .map(String::trim)
                    .map(tag -> tag.startsWith("#") ? tag.substring(1) : tag)
                    .filter(tag -> !tag.isBlank())
                    .forEach(tags::add);
        }
        if (tags.isEmpty()) {
            throw new BusinessException(TripErrorCode.INVALID_TRIP, "공개 여행방은 태그를 한 개 이상 입력해야 합니다.");
        }
        return List.copyOf(tags);
    }

    private void saveTags(Trip trip, PlanCard card, List<String> tags) {
        for (int index = 0; index < tags.size(); index++) {
            int sortOrder = index;
            TripTag tag = tripTagRepository.findByTripIdAndName(trip.getId(), tags.get(index))
                    .orElseGet(() -> tripTagRepository.save(
                            TripTag.create(
                                    trip.getId(),
                                    tags.get(sortOrder),
                                    trip.getOwnerId(),
                                    sortOrder
                            )));
            if (!planCardTagRepository.existsByPlanCardIdAndTagId(card.getId(), tag.getId())) {
                planCardTagRepository.save(PlanCardTag.create(card.getId(), tag.getId()));
            }
        }
    }
}
