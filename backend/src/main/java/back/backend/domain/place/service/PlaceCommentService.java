package back.backend.domain.place.service;

import back.backend.domain.place.dto.request.AddPlaceCommentRequest;
import back.backend.domain.collaboration.notification.entity.NotificationType;
import back.backend.domain.collaboration.service.CollaborationEventService;
import back.backend.domain.place.dto.response.PlaceCommentResponse;
import back.backend.domain.place.entity.PlaceComment;
import back.backend.domain.place.exception.PlaceErrorCode;
import back.backend.domain.place.repository.PlaceCommentRepository;
import back.backend.domain.place.repository.TripPlaceRepository;
import back.backend.global.exception.BusinessException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PlaceCommentService {

    private final TripPlaceRepository tripPlaceRepository;
    private final PlaceCommentRepository commentRepository;
    private final TripAccessChecker accessChecker;
    private final CollaborationEventService collaborationEventService;

    public List<PlaceCommentResponse> getComments(Long tripId, Long tripPlaceId) {
        accessChecker.requireView(tripId);
        verifyTripPlace(tripPlaceId, tripId);
        return commentRepository.findAllByTripPlaceIdOrderByIdAsc(tripPlaceId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public PlaceCommentResponse addComment(Long tripId, Long tripPlaceId, AddPlaceCommentRequest request) {
        Long memberId = accessChecker.requireMember(tripId);
        var tripPlace = verifyTripPlace(tripPlaceId, tripId);
        PlaceComment comment = commentRepository.save(PlaceComment.builder()
                .tripPlaceId(tripPlaceId)
                .memberId(memberId)
                .content(request.content())
                .createdAt(LocalDateTime.now())
                .build());
        collaborationEventService.record(
                tripId,
                memberId,
                "PLACE_COMMENT_ADDED",
                "TRIP_PLACE",
                tripPlaceId,
                tripPlace.getPlace().getName() + " 장소에 댓글이 등록됐습니다.",
                Map.of("placeName", tripPlace.getPlace().getName()),
                NotificationType.PLACE,
                "장소 댓글"
        );
        return toResponse(comment);
    }

    @Transactional
    public void deleteComment(Long tripId, Long tripPlaceId, Long commentId) {
        Long memberId = accessChecker.requireMember(tripId);
        var tripPlace = verifyTripPlace(tripPlaceId, tripId);
        PlaceComment comment = commentRepository
                .findByIdAndTripPlaceIdAndMemberId(commentId, tripPlaceId, memberId)
                .orElseThrow(() -> new BusinessException(PlaceErrorCode.PLACE_COMMENT_NOT_FOUND));
        commentRepository.delete(comment);
        collaborationEventService.record(
                tripId,
                memberId,
                "PLACE_COMMENT_DELETED",
                "TRIP_PLACE",
                tripPlaceId,
                tripPlace.getPlace().getName() + " 장소의 댓글이 삭제됐습니다.",
                Map.of("placeName", tripPlace.getPlace().getName()),
                NotificationType.PLACE,
                "장소 댓글 삭제"
        );
    }

    private back.backend.domain.place.entity.TripPlace verifyTripPlace(Long tripPlaceId, Long tripId) {
        return tripPlaceRepository.findByIdAndTripId(tripPlaceId, tripId)
                .orElseThrow(() -> new BusinessException(PlaceErrorCode.TRIP_PLACE_NOT_FOUND));
    }

    private PlaceCommentResponse toResponse(PlaceComment comment) {
        return new PlaceCommentResponse(
                comment.getId(),
                comment.getTripPlaceId(),
                comment.getMemberId(),
                comment.getContent(),
                comment.getCreatedAt().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
        );
    }

}
