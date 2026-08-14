package back.backend.domain.trip.service;

import back.backend.domain.card.entity.PlanCard;
import back.backend.domain.card.entity.PlanCardTag;
import back.backend.domain.card.entity.TripTag;
import back.backend.domain.card.repository.PlanCardRepository;
import back.backend.domain.card.repository.PlanCardTagRepository;
import back.backend.domain.card.repository.TripTagRepository;
import back.backend.domain.collaboration.activitylog.dto.ActivityLogCreateCommand;
import back.backend.domain.collaboration.activitylog.service.ActivityLogService;
import back.backend.domain.place.repository.TripPlaceRepository;
import back.backend.domain.travelrecord.entity.TravelRecord;
import back.backend.domain.travelrecord.repository.TravelPhotoRepository;
import back.backend.domain.travelrecord.repository.TravelRecordRepository;
import back.backend.domain.trip.dto.TripCompletionConfirmationRequest;
import back.backend.domain.trip.dto.TripResponse;
import back.backend.domain.trip.dto.TripVisibilitySettingsResponse;
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
    private final TripPlaceRepository tripPlaceRepository;
    private final TravelRecordRepository travelRecordRepository;
    private final TravelPhotoRepository travelPhotoRepository;
    private final ActivityLogService activityLogService;
    private final Clock clock;

    public TripCompletionConfirmationService(
            TripRepository tripRepository,
            TripMemberRepository tripMemberRepository,
            PlanCardRepository planCardRepository,
            TripTagRepository tripTagRepository,
            PlanCardTagRepository planCardTagRepository,
            TripPlaceRepository tripPlaceRepository,
            TravelRecordRepository travelRecordRepository,
            TravelPhotoRepository travelPhotoRepository,
            ActivityLogService activityLogService,
            Clock clock
    ) {
        this.tripRepository = tripRepository;
        this.tripMemberRepository = tripMemberRepository;
        this.planCardRepository = planCardRepository;
        this.tripTagRepository = tripTagRepository;
        this.planCardTagRepository = planCardTagRepository;
        this.tripPlaceRepository = tripPlaceRepository;
        this.travelRecordRepository = travelRecordRepository;
        this.travelPhotoRepository = travelPhotoRepository;
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
        List<String> tags = normalizeTags(request, trip);
        try {
            trip.confirmCompletion(request.visibility(), LocalDateTime.now(clock));
        } catch (IllegalStateException exception) {
            throw new BusinessException(TripErrorCode.INVALID_TRIP);
        }
        card.changeVisibility(request.visibility());
        trip.updateDescription(request.description());
        card.updateSummary(request.description());
        replaceTags(trip, card, tags);
        activityLogService.create(new ActivityLogCreateCommand(
                tripId, memberId, "TRIP_COMPLETION_CONFIRMED", "TRIP", tripId,
                "여행방 완료와 공개 설정을 확인했습니다.",
                Map.of("visibility", request.visibility().name(), "tags", tags)
        ));
        return TripResponse.from(trip, tripMemberRepository.countByTripId(tripId));
    }

    @Transactional(readOnly = true)
    public TripVisibilitySettingsResponse getSettings(Long memberId, Long tripId) {
        Trip trip = tripRepository.findByIdAndMemberIdAndStatusNot(
                        tripId, memberId, TripStatus.CANCELLED)
                .orElseThrow(() -> new BusinessException(TripErrorCode.TRIP_NOT_FOUND));
        if (trip.getStatus() != TripStatus.COMPLETED) {
            throw new BusinessException(TripErrorCode.TRIP_VISIBILITY_NOT_AVAILABLE);
        }
        List<String> tags = tripTagRepository
                .findAllByTripIdOrderBySortOrderAsc(tripId)
                .stream()
                .map(TripTag::getName)
                .toList();
        int placeCount = tripPlaceRepository.findAllOrderedByTripId(tripId).size();
        List<TravelRecord> records = travelRecordRepository.findAllByTripIdOrderByVisitedAtDescIdDesc(tripId);
        int photoCount = travelPhotoRepository
                .findAllByTravelRecordIdInOrderBySortOrderAsc(records.stream().map(TravelRecord::getId).toList())
                .size();
        return new TripVisibilitySettingsResponse(
                trip.getVisibility(), tags, trip.getDescription(),
                placeCount, photoCount, records.size());
    }

    private List<String> normalizeTags(TripCompletionConfirmationRequest request, Trip trip) {
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
        if (tags.isEmpty() && trip.getTravelStyles().isEmpty()) {
            throw new BusinessException(TripErrorCode.INVALID_TRIP, "공개 여행방은 태그를 한 개 이상 입력해야 합니다.");
        }
        return List.copyOf(tags);
    }

    private void replaceTags(Trip trip, PlanCard card, List<String> tags) {
        planCardTagRepository.deleteAllByPlanCardId(card.getId());
        planCardTagRepository.flush();
        tripTagRepository.deleteAllByTripId(trip.getId());
        tripTagRepository.flush();
        for (int index = 0; index < tags.size(); index++) {
            TripTag tag = tripTagRepository.save(TripTag.create(
                    trip.getId(),
                    tags.get(index),
                    trip.getOwnerId(),
                    index
            ));
            planCardTagRepository.save(PlanCardTag.create(card.getId(), tag.getId()));
        }
    }
}
