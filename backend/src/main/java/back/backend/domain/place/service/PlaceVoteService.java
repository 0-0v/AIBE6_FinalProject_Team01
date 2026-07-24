package back.backend.domain.place.service;

import back.backend.domain.place.dto.request.RespondPlaceVoteRequest;
import back.backend.domain.collaboration.notification.entity.NotificationType;
import back.backend.domain.collaboration.service.CollaborationEventService;
import back.backend.domain.place.dto.response.PlaceVoteSummaryResponse;
import back.backend.domain.place.dto.response.PlaceVoteNotificationResponse;
import back.backend.domain.place.entity.PlaceVoteChoice;
import back.backend.domain.place.entity.PlaceVoteRequest;
import back.backend.domain.place.entity.PlaceVoteResponse;
import back.backend.domain.place.entity.PlaceVoteStatus;
import back.backend.domain.place.entity.TripPlace;
import back.backend.domain.place.entity.TripPlaceStatus;
import back.backend.domain.place.exception.PlaceErrorCode;
import back.backend.domain.place.repository.PlaceVoteNotificationRepository;
import back.backend.domain.place.repository.PlaceVoteRequestRepository;
import back.backend.domain.place.repository.PlaceVoteResponseRepository;
import back.backend.domain.place.repository.TripPlaceRepository;
import back.backend.global.exception.BusinessException;
import back.backend.global.security.SecurityContextAccessor;
import back.backend.domain.trip.repository.TripMemberRepository;
import java.time.LocalDateTime;
import java.time.Duration;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PlaceVoteService {

    private static final Duration VOTE_DURATION = Duration.ofHours(24);

    private final TripPlaceRepository tripPlaceRepository;
    private final PlaceVoteRequestRepository voteRequestRepository;
    private final PlaceVoteResponseRepository voteResponseRepository;
    private final PlaceVoteNotificationRepository notificationRepository;
    private final SecurityContextAccessor securityContextAccessor;
    private final TripAccessChecker accessChecker;
    private final TripMemberRepository tripMemberRepository;
    private final CollaborationEventService collaborationEventService;

    @Transactional
    public PlaceVoteSummaryResponse startVote(Long tripId, Long tripPlaceId) {
        Long memberId = accessChecker.requireEdit(tripId);
        TripPlace tripPlace = tripPlaceRepository.findByIdAndTripIdForUpdate(tripPlaceId, tripId)
                .orElseThrow(() -> new BusinessException(PlaceErrorCode.TRIP_PLACE_NOT_FOUND));
        LocalDateTime now = LocalDateTime.now();
        PlaceVoteRequest latestRequest = voteRequestRepository
                .findFirstByTripPlaceIdOrderByIdDesc(tripPlaceId)
                .orElse(null);
        if (latestRequest != null && latestRequest.getStatus() == PlaceVoteStatus.OPEN) {
            if (!isExpired(latestRequest, now)) {
                throw new BusinessException(PlaceErrorCode.PLACE_VOTE_ALREADY_REQUESTED);
            }
            latestRequest.close(now);
            tripPlace.updateStatus(TripPlaceStatus.REJECTED);
        }

        List<Long> memberIds = tripMemberRepository.findMemberIdsByTripId(tripId);
        int totalMemberCount = memberIds.size();
        int majorityCount = totalMemberCount / 2 + 1;
        tripPlace.updateStatus(TripPlaceStatus.HOLD);
        PlaceVoteRequest voteRequest = voteRequestRepository.save(PlaceVoteRequest.builder()
                .tripPlaceId(tripPlaceId)
                .createdBy(memberId)
                .status(PlaceVoteStatus.OPEN)
                .requiredResponseCount(majorityCount)
                .totalMemberCount(totalMemberCount)
                .createdAt(now)
                .expiresAt(now.plus(VOTE_DURATION))
                .build());

        collaborationEventService.record(
                tripId,
                memberId,
                "PLACE_VOTE_STARTED",
                "TRIP_PLACE",
                tripPlaceId,
                tripPlace.getPlace().getName() + " 갈래말래 투표가 시작됐습니다.",
                Map.of("placeName", tripPlace.getPlace().getName(), "voteRequestId", voteRequest.getId()),
                NotificationType.VOTE,
                "장소 투표"
        );
        return summarize(voteRequest, memberId, List.of(), tripPlace.getStatus());
    }

    @Transactional
    public PlaceVoteSummaryResponse respond(
            Long tripId,
            Long tripPlaceId,
            RespondPlaceVoteRequest request
    ) {
        Long memberId = accessChecker.requireView(tripId);
        TripPlace tripPlace = tripPlaceRepository.findByIdAndTripIdForUpdate(tripPlaceId, tripId)
                .orElseThrow(() -> new BusinessException(PlaceErrorCode.TRIP_PLACE_NOT_FOUND));
        Long voteRequestId = voteRequestRepository.findFirstByTripPlaceIdOrderByIdDesc(tripPlaceId)
                .orElseThrow(() -> new BusinessException(PlaceErrorCode.PLACE_VOTE_NOT_FOUND))
                .getId();
        PlaceVoteRequest voteRequest = voteRequestRepository.findByIdForUpdate(voteRequestId)
                .orElseThrow(() -> new BusinessException(PlaceErrorCode.PLACE_VOTE_NOT_FOUND));
        if (voteRequest.getStatus() == PlaceVoteStatus.CLOSED) {
            throw new BusinessException(PlaceErrorCode.PLACE_VOTE_CLOSED);
        }

        LocalDateTime now = LocalDateTime.now();
        if (isExpired(voteRequest, now)) {
            voteRequest.close(now);
            tripPlace.updateStatus(TripPlaceStatus.REJECTED);
            List<PlaceVoteResponse> responses = voteResponseRepository
                    .findAllByVoteRequestId(voteRequestId);
            return summarize(voteRequest, memberId, responses, tripPlace.getStatus());
        }
        PlaceVoteResponse response = voteResponseRepository
                .findByVoteRequestIdAndMemberId(voteRequestId, memberId)
                .orElseGet(() -> PlaceVoteResponse.builder()
                        .voteRequestId(voteRequestId)
                        .memberId(memberId)
                        .createdAt(now)
                        .build());
        response.updateChoice(request.choice(), now);
        voteResponseRepository.saveAndFlush(response);

        List<PlaceVoteResponse> responses = voteResponseRepository.findAllByVoteRequestId(voteRequestId);
        int agreeCount = (int) responses.stream()
                .filter(item -> item.getChoice() == PlaceVoteChoice.AGREE)
                .count();
        int disagreeCount = responses.size() - agreeCount;
        int majorityCount = voteRequest.getRequiredResponseCount();
        if (agreeCount >= majorityCount) {
            // 과반수 찬성 → 확정
            tripPlace.updateStatus(TripPlaceStatus.SAVED);
            voteRequest.close(now);
        } else if (disagreeCount >= majorityCount) {
            // 과반수 반대 → 탈락
            tripPlace.updateStatus(TripPlaceStatus.REJECTED);
            voteRequest.close(now);
        } else if (responses.size() >= voteRequest.getTotalMemberCount()) {
            // 전원 투표 완료이지만 동률 → 투표 종료 후 HOLD 유지 (재투표 가능)
            tripPlace.updateStatus(TripPlaceStatus.HOLD);
            voteRequest.close(now);
        }
        String choiceLabel = request.choice() == PlaceVoteChoice.AGREE ? "찬성" : "반대";
        collaborationEventService.record(
                tripId,
                memberId,
                "PLACE_VOTE_RESPONDED",
                "TRIP_PLACE",
                tripPlaceId,
                tripPlace.getPlace().getName() + " 투표에 " + choiceLabel + " 의견이 등록됐습니다.",
                Map.of(
                        "placeName", tripPlace.getPlace().getName(),
                        "voteRequestId", voteRequest.getId(),
                        "choice", request.choice().name()
                ),
                NotificationType.VOTE,
                "장소 투표"
        );
        return summarize(voteRequest, memberId, responses, tripPlace.getStatus());
    }

    @Transactional
    public List<PlaceVoteSummaryResponse> getVotes(Long tripId) {
        Long memberId = accessChecker.requireView(tripId);
        List<TripPlace> tripPlaces = tripPlaceRepository.findAllOrderedByTripId(tripId);
        List<Long> tripPlaceIds = tripPlaces.stream().map(TripPlace::getId).toList();
        if (tripPlaceIds.isEmpty()) {
            return List.of();
        }
        List<PlaceVoteRequest> latestRequests = voteRequestRepository
                .findLatestByTripPlaceIdIn(tripPlaceIds);
        LocalDateTime now = LocalDateTime.now();
        Map<Long, TripPlace> tripPlacesById = tripPlaces.stream()
                .collect(Collectors.toMap(TripPlace::getId, place -> place));
        latestRequests.stream()
                .filter(request -> request.getStatus() == PlaceVoteStatus.OPEN)
                .filter(request -> isExpired(request, now))
                .forEach(request -> {
                    request.close(now);
                    TripPlace tripPlace = tripPlacesById.get(request.getTripPlaceId());
                    if (tripPlace != null) {
                        tripPlace.updateStatus(TripPlaceStatus.REJECTED);
                    }
                });
        List<Long> voteRequestIds = latestRequests.stream()
                .map(PlaceVoteRequest::getId)
                .toList();
        Map<Long, List<PlaceVoteResponse>> responsesByRequestId = voteResponseRepository
                .findAllByVoteRequestIdIn(voteRequestIds).stream()
                .collect(Collectors.groupingBy(PlaceVoteResponse::getVoteRequestId));
        Map<Long, TripPlaceStatus> statusesByTripPlaceId = tripPlaces.stream()
                .collect(Collectors.toMap(TripPlace::getId, TripPlace::getStatus));
        return latestRequests.stream()
                .map(request -> summarize(
                        request,
                        memberId,
                        responsesByRequestId.getOrDefault(request.getId(), List.of()),
                        statusesByTripPlaceId.get(request.getTripPlaceId())))
                .toList();
    }

    public List<PlaceVoteNotificationResponse> getNotifications() {
        return notificationRepository.findNotifications(
                securityContextAccessor.getCurrentMemberId());
    }

    @Transactional
    public void markNotificationRead(Long notificationId) {
        boolean updated = notificationRepository.markRead(
                notificationId, securityContextAccessor.getCurrentMemberId());
        if (!updated) {
            throw new BusinessException(PlaceErrorCode.PLACE_VOTE_NOTIFICATION_NOT_FOUND);
        }
    }

    private PlaceVoteSummaryResponse summarize(
            PlaceVoteRequest request,
            Long memberId,
            List<PlaceVoteResponse> responses,
            TripPlaceStatus placeStatus
    ) {
        int agreeCount = (int) responses.stream()
                .filter(response -> response.getChoice() == PlaceVoteChoice.AGREE)
                .count();
        int disagreeCount = responses.size() - agreeCount;
        PlaceVoteChoice myChoice = responses.stream()
                .filter(response -> response.getMemberId().equals(memberId))
                .map(PlaceVoteResponse::getChoice)
                .findFirst()
                .orElse(null);
        return new PlaceVoteSummaryResponse(
                request.getTripPlaceId(),
                request.getId(),
                request.getStatus(),
                agreeCount,
                disagreeCount,
                agreeCount + disagreeCount,
                request.getRequiredResponseCount(),
                request.getTotalMemberCount(),
                myChoice,
                placeStatus,
                request.getExpiresAt() != null
                        ? request.getExpiresAt().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
                        : null
        );
    }

    private boolean isExpired(PlaceVoteRequest request, LocalDateTime now) {
        return request.getExpiresAt() != null && !request.getExpiresAt().isAfter(now);
    }

}
