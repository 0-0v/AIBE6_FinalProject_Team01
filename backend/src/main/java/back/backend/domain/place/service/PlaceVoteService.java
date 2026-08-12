package back.backend.domain.place.service;

import back.backend.domain.collaboration.notification.entity.NotificationType;
import back.backend.domain.collaboration.service.CollaborationEventService;
import back.backend.domain.place.dto.request.CreatePlaceVoteRequest;
import back.backend.domain.place.dto.request.RespondPlaceVoteRequest;
import back.backend.domain.place.dto.response.PlaceVoteSummaryResponse;
import back.backend.domain.place.dto.response.PlaceVoteSummaryResponse.PlaceOptionResponse;
import back.backend.domain.place.entity.*;
import back.backend.domain.place.exception.PlaceErrorCode;
import back.backend.domain.place.repository.PlaceVoteRequestRepository;
import back.backend.domain.place.repository.PlaceVoteResponseRepository;
import back.backend.domain.place.repository.TripPlaceRepository;
import back.backend.domain.trip.repository.TripMemberRepository;
import back.backend.global.exception.BusinessException;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.function.Function;
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
    private final TripAccessChecker accessChecker;
    private final TripMemberRepository tripMemberRepository;
    private final CollaborationEventService collaborationEventService;
    private final PlaceVoteAiInfoService aiInfoService;

    @Transactional
    public PlaceVoteSummaryResponse startVote(Long tripId, Long tripPlaceId) {
        return startVote(tripId, new CreatePlaceVoteRequest(
                PlaceVoteType.PLACE_APPROVAL, tripPlaceId, null, null));
    }

    @Transactional
    public PlaceVoteSummaryResponse startVote(Long tripId, CreatePlaceVoteRequest request) {
        Long memberId = accessChecker.requireEdit(tripId);
        Map<Long, TripPlace> lockedPlaces = lockVotePlaces(tripId, request);
        TripPlace primary = lockedPlaces.get(request.primaryTripPlaceId());
        TripPlace secondary = request.secondaryTripPlaceId() == null
                ? null : lockedPlaces.get(request.secondaryTripPlaceId());
        List<Long> targetIds = secondary == null
                ? List.of(primary.getId()) : List.of(primary.getId(), secondary.getId());
        LocalDateTime now = LocalDateTime.now();
        if (voteRequestRepository.existsOpenVoteForAnyPlace(targetIds, now)) {
            throw new BusinessException(PlaceErrorCode.PLACE_VOTE_ALREADY_REQUESTED);
        }
        List<Long> memberIds = tripMemberRepository.findMemberIdsByTripId(tripId);
        int totalMemberCount = memberIds.size();
        PlaceVoteAiInfoService.VoteAiInfo aiInfo = aiInfoService.generate(
                primary.getPlace(), secondary == null ? null : secondary.getPlace());
        PlaceVoteRequest vote = voteRequestRepository.save(PlaceVoteRequest.builder()
                .tripPlaceId(primary.getId())
                .secondaryTripPlaceId(secondary == null ? null : secondary.getId())
                .voteType(request.type())
                .creatorComment(normalize(request.creatorComment()))
                .primaryAiDescription(aiInfo.primaryDescription())
                .secondaryAiDescription(aiInfo.secondaryDescription())
                .comparisonSummary(aiInfo.comparisonSummary())
                .createdBy(memberId)
                .status(PlaceVoteStatus.OPEN)
                .requiredResponseCount(totalMemberCount / 2 + 1)
                .totalMemberCount(totalMemberCount)
                .createdAt(now)
                .expiresAt(now.plus(VOTE_DURATION))
                .build());
        collaborationEventService.record(tripId, memberId, "PLACE_VOTE_STARTED", "PLACE_VOTE", vote.getId(),
                displayTitle(vote, primary, secondary) + " 투표가 시작되었습니다.",
                Map.of("voteRequestId", vote.getId(), "voteType", vote.getVoteType().name()),
                NotificationType.VOTE, "장소 투표");
        Map<Long, TripPlace> votePlaces = new HashMap<>();
        votePlaces.put(primary.getId(), primary);
        if (secondary != null) votePlaces.put(secondary.getId(), secondary);
        return summarize(vote, memberId, List.of(), votePlaces);
    }

    @Transactional
    public PlaceVoteSummaryResponse respond(Long tripId, Long tripPlaceId, RespondPlaceVoteRequest request) {
        PlaceVoteRequest latest = voteRequestRepository.findFirstByTripPlaceIdOrderByIdDesc(tripPlaceId)
                .orElseThrow(() -> new BusinessException(PlaceErrorCode.PLACE_VOTE_NOT_FOUND));
        return respond(tripId, latest.getId(), request, true);
    }

    @Transactional
    public PlaceVoteSummaryResponse respondByVoteId(Long tripId, Long voteRequestId, RespondPlaceVoteRequest request) {
        return respond(tripId, voteRequestId, request, false);
    }

    private PlaceVoteSummaryResponse respond(Long tripId, Long voteRequestId, RespondPlaceVoteRequest input, boolean legacy) {
        Long memberId = accessChecker.requireView(tripId);
        PlaceVoteRequest vote = voteRequestRepository.findByIdForUpdate(voteRequestId)
                .orElseThrow(() -> new BusinessException(PlaceErrorCode.PLACE_VOTE_NOT_FOUND));
        Map<Long, TripPlace> places = loadVotePlaces(tripId, vote);
        if (vote.getStatus() == PlaceVoteStatus.CLOSED) throw new BusinessException(PlaceErrorCode.PLACE_VOTE_CLOSED);
        validateChoice(vote.getVoteType(), input.choice());
        LocalDateTime now = LocalDateTime.now();
        if (isExpired(vote, now)) {
            List<PlaceVoteResponse> responses = voteResponseRepository.findAllByVoteRequestId(voteRequestId);
            closeVote(vote, responses, now);
            return summarize(vote, memberId, responses, places);
        }
        PlaceVoteResponse response = voteResponseRepository.findByVoteRequestIdAndMemberId(voteRequestId, memberId)
                .orElseGet(() -> PlaceVoteResponse.builder().voteRequestId(voteRequestId).memberId(memberId).createdAt(now).build());
        response.updateChoice(input.choice(), now);
        voteResponseRepository.saveAndFlush(response);
        List<PlaceVoteResponse> responses = voteResponseRepository.findAllByVoteRequestId(voteRequestId);
        if (shouldClose(vote, responses)) closeVote(vote, responses, now);
        TripPlace primary = places.get(vote.getTripPlaceId());
        String actionType = vote.getStatus() == PlaceVoteStatus.CLOSED
                ? "PLACE_VOTE_CLOSED" : "PLACE_VOTE_RESPONDED";
        String description = displayTitle(vote, primary,
                vote.getSecondaryTripPlaceId() == null ? null : places.get(vote.getSecondaryTripPlaceId()))
                + (vote.getStatus() == PlaceVoteStatus.CLOSED
                ? " 투표가 종료되었습니다." : " 투표에 새 응답이 등록되었습니다.");
        collaborationEventService.record(
                tripId, memberId, actionType, "PLACE_VOTE", vote.getId(), description,
                Map.of("voteRequestId", vote.getId(), "choice", input.choice().name()),
                NotificationType.VOTE,
                vote.getStatus() == PlaceVoteStatus.CLOSED ? "장소 투표 종료" : "장소 투표 참여");
        return summarize(vote, memberId, responses, places);
    }

    @Transactional
    public List<PlaceVoteSummaryResponse> getVotes(Long tripId) {
        Long memberId = accessChecker.requireView(tripId);
        List<TripPlace> tripPlaces = tripPlaceRepository.findAllOrderedByTripId(tripId);
        if (tripPlaces.isEmpty()) return List.of();
        Map<Long, TripPlace> places = tripPlaces.stream().collect(Collectors.toMap(TripPlace::getId, Function.identity()));
        List<PlaceVoteRequest> votes = voteRequestRepository.findAllByTripPlaceIds(places.keySet());
        LocalDateTime now = LocalDateTime.now();
        List<Long> ids = votes.stream().map(PlaceVoteRequest::getId).toList();
        Map<Long, List<PlaceVoteResponse>> responses = ids.isEmpty() ? Map.of() : voteResponseRepository
                .findAllByVoteRequestIdIn(ids).stream().collect(Collectors.groupingBy(PlaceVoteResponse::getVoteRequestId));
        votes.stream().filter(v -> v.getStatus() == PlaceVoteStatus.OPEN && isExpired(v, now))
                .forEach(v -> closeVote(v, responses.getOrDefault(v.getId(), List.of()), now));
        return votes.stream().map(v -> summarize(v, memberId, responses.getOrDefault(v.getId(), List.of()), places)).toList();
    }

    private void closeVote(PlaceVoteRequest vote, List<PlaceVoteResponse> responses, LocalDateTime now) {
        long positive = count(responses, vote.getVoteType() == PlaceVoteType.PLACE_APPROVAL ? PlaceVoteChoice.AGREE : PlaceVoteChoice.OPTION_A);
        long negative = count(responses, vote.getVoteType() == PlaceVoteType.PLACE_APPROVAL ? PlaceVoteChoice.DISAGREE : PlaceVoteChoice.OPTION_B);
        if (vote.getVoteType() == PlaceVoteType.PLACE_APPROVAL) {
            vote.close(now, positive > negative ? PlaceVoteResult.SELECTED : PlaceVoteResult.NOT_SELECTED,
                    positive > negative ? vote.getTripPlaceId() : null);
        } else if (positive == negative) {
            vote.close(now, PlaceVoteResult.TIE, null);
        } else {
            vote.close(now, PlaceVoteResult.SELECTED, positive > negative ? vote.getTripPlaceId() : vote.getSecondaryTripPlaceId());
        }
    }

    private boolean shouldClose(PlaceVoteRequest vote, List<PlaceVoteResponse> responses) {
        long first = count(responses, vote.getVoteType() == PlaceVoteType.PLACE_APPROVAL ? PlaceVoteChoice.AGREE : PlaceVoteChoice.OPTION_A);
        long second = count(responses, vote.getVoteType() == PlaceVoteType.PLACE_APPROVAL ? PlaceVoteChoice.DISAGREE : PlaceVoteChoice.OPTION_B);
        return first >= vote.getRequiredResponseCount() || second >= vote.getRequiredResponseCount()
                || responses.size() >= vote.getTotalMemberCount();
    }

    private PlaceVoteSummaryResponse summarize(PlaceVoteRequest vote, Long memberId, List<PlaceVoteResponse> responses,
                                                Map<Long, TripPlace> places) {
        TripPlace primary = places.get(vote.getTripPlaceId());
        TripPlace secondary = vote.getSecondaryTripPlaceId() == null ? null : places.get(vote.getSecondaryTripPlaceId());
        PlaceVoteChoice firstChoice = vote.getVoteType() == PlaceVoteType.PLACE_APPROVAL ? PlaceVoteChoice.AGREE : PlaceVoteChoice.OPTION_A;
        PlaceVoteChoice secondChoice = vote.getVoteType() == PlaceVoteType.PLACE_APPROVAL ? PlaceVoteChoice.DISAGREE : PlaceVoteChoice.OPTION_B;
        int first = (int) count(responses, firstChoice);
        int second = (int) count(responses, secondChoice);
        PlaceVoteChoice mine = responses.stream().filter(r -> r.getMemberId().equals(memberId)).map(PlaceVoteResponse::getChoice).findFirst().orElse(null);
        return new PlaceVoteSummaryResponse(vote.getTripPlaceId(), vote.getSecondaryTripPlaceId(), vote.getId(), vote.getVoteType(),
                vote.getCreatorComment(), option(primary, vote.getPrimaryAiDescription()),
                option(secondary, vote.getSecondaryAiDescription()), vote.getComparisonSummary(), vote.getStatus(),
                first, second, first + second, vote.getRequiredResponseCount(), vote.getTotalMemberCount(), mine,
                vote.getResult(), vote.getWinnerTripPlaceId(), vote.getExpiresAt().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
    }

    private PlaceOptionResponse option(TripPlace tripPlace, String description) {
        return tripPlace == null ? null : new PlaceOptionResponse(tripPlace.getId(), tripPlace.getPlace().getName(),
                tripPlace.getPlace().getAddress(), description);
    }

    private Map<Long, TripPlace> lockVotePlaces(Long tripId, CreatePlaceVoteRequest request) {
        if (request.type() == PlaceVoteType.PLACE_APPROVAL) {
            TripPlace primary = findPlace(tripId, request.primaryTripPlaceId());
            return Map.of(primary.getId(), primary);
        }
        if (request.secondaryTripPlaceId() == null || request.secondaryTripPlaceId().equals(request.primaryTripPlaceId())) {
            throw new BusinessException(PlaceErrorCode.PLACE_VOTE_INVALID_INPUT);
        }
        List<Long> ids = new ArrayList<>(List.of(request.primaryTripPlaceId(), request.secondaryTripPlaceId()));
        ids.sort(Long::compareTo);
        Map<Long, TripPlace> places = tripPlaceRepository.findAllByIdsAndTripIdForUpdate(ids, tripId)
                .stream().collect(Collectors.toMap(TripPlace::getId, Function.identity()));
        TripPlace primary = places.get(request.primaryTripPlaceId());
        TripPlace secondary = places.get(request.secondaryTripPlaceId());
        if (primary == null || secondary == null) {
            throw new BusinessException(PlaceErrorCode.TRIP_PLACE_NOT_FOUND);
        }
        if (isSamePlace(primary.getPlace(), secondary.getPlace())) {
            throw new BusinessException(PlaceErrorCode.PLACE_VOTE_INVALID_INPUT);
        }
        return places;
    }

    private void validateChoice(PlaceVoteType type, PlaceVoteChoice choice) {
        boolean valid = type == PlaceVoteType.PLACE_APPROVAL
                ? choice == PlaceVoteChoice.AGREE || choice == PlaceVoteChoice.DISAGREE
                : choice == PlaceVoteChoice.OPTION_A || choice == PlaceVoteChoice.OPTION_B;
        if (!valid) throw new BusinessException(PlaceErrorCode.PLACE_VOTE_INVALID_INPUT);
    }

    private TripPlace findPlace(Long tripId, Long id) {
        return tripPlaceRepository.findByIdAndTripIdForUpdate(id, tripId)
                .orElseThrow(() -> new BusinessException(PlaceErrorCode.TRIP_PLACE_NOT_FOUND));
    }

    private Map<Long, TripPlace> loadVotePlaces(Long tripId, PlaceVoteRequest vote) {
        TripPlace primary = findPlace(tripId, vote.getTripPlaceId());
        Map<Long, TripPlace> result = new HashMap<>();
        result.put(primary.getId(), primary);
        if (vote.getSecondaryTripPlaceId() != null) {
            TripPlace secondary = findPlace(tripId, vote.getSecondaryTripPlaceId());
            result.put(secondary.getId(), secondary);
        }
        return result;
    }

    private long count(List<PlaceVoteResponse> responses, PlaceVoteChoice choice) {
        return responses.stream().filter(r -> r.getChoice() == choice).count();
    }

    private boolean isExpired(PlaceVoteRequest vote, LocalDateTime now) {
        return vote.getExpiresAt() != null && !vote.getExpiresAt().isAfter(now);
    }

    private String normalize(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private boolean isSamePlace(Place first, Place second) {
        if (first == second || (first.getId() != null && first.getId().equals(second.getId()))) return true;
        return first.getGooglePlaceId() != null
                && first.getGooglePlaceId().equals(second.getGooglePlaceId());
    }

    private String displayTitle(PlaceVoteRequest vote, TripPlace primary, TripPlace secondary) {
        return secondary == null ? primary.getPlace().getName() : primary.getPlace().getName() + " VS " + secondary.getPlace().getName();
    }
}
