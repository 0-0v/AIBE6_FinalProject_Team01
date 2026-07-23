package back.backend.domain.place.service;

import back.backend.domain.place.dto.request.AddPlaceCommentRequest;
import back.backend.domain.place.dto.response.PlaceCommentResponse;
import back.backend.domain.place.entity.PlaceComment;
import back.backend.domain.place.exception.PlaceErrorCode;
import back.backend.domain.place.repository.PlaceCommentRepository;
import back.backend.domain.place.repository.TripPlaceRepository;
import back.backend.global.exception.BusinessException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
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
        Long memberId = accessChecker.requireView(tripId);
        verifyTripPlace(tripPlaceId, tripId);
        PlaceComment comment = commentRepository.save(PlaceComment.builder()
                .tripPlaceId(tripPlaceId)
                .memberId(memberId)
                .content(request.content())
                .createdAt(LocalDateTime.now())
                .build());
        return toResponse(comment);
    }

    @Transactional
    public void deleteComment(Long tripId, Long tripPlaceId, Long commentId) {
        Long memberId = accessChecker.requireView(tripId);
        verifyTripPlace(tripPlaceId, tripId);
        PlaceComment comment = commentRepository.findByIdAndMemberId(commentId, memberId)
                .orElseThrow(() -> new BusinessException(PlaceErrorCode.PLACE_COMMENT_NOT_FOUND));
        commentRepository.delete(comment);
    }

    private void verifyTripPlace(Long tripPlaceId, Long tripId) {
        tripPlaceRepository.findByIdAndTripId(tripPlaceId, tripId)
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
