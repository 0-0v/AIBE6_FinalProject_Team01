package back.backend.domain.place.service;

import back.backend.domain.collaboration.notification.entity.NotificationType;
import back.backend.domain.collaboration.service.CollaborationEventService;
import back.backend.domain.member.entity.Member;
import back.backend.domain.member.repository.MemberRepository;
import back.backend.domain.place.dto.request.AddMapPinCommentRequest;
import back.backend.domain.place.dto.response.MapPinCommentResponse;
import back.backend.domain.place.dto.response.MapPinSummaryResponse;
import back.backend.domain.place.entity.MapPin;
import back.backend.domain.place.entity.MapPinComment;
import back.backend.domain.place.exception.PlaceErrorCode;
import back.backend.domain.place.repository.MapPinCommentRepository;
import back.backend.domain.place.repository.MapPinRepository;
import back.backend.global.exception.BusinessException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MapPinCommentService {

    private static final String UNKNOWN_MEMBER_NICKNAME = "알 수 없는 멤버";

    private final MapPinRepository mapPinRepository;
    private final MapPinPersistenceService mapPinPersistenceService;
    private final MapPinCommentRepository commentRepository;
    private final MemberRepository memberRepository;
    private final TripAccessChecker accessChecker;
    private final CollaborationEventService collaborationEventService;

    public List<MapPinSummaryResponse> getPinSummaries(Long tripId) {
        accessChecker.requireView(tripId);
        List<MapPin> pins = mapPinRepository.findAllByTripId(tripId);
        if (pins.isEmpty()) {
            return List.of();
        }
        Map<Long, Long> countsByPinId = commentRepository
                .countByMapPinIds(pins.stream().map(MapPin::getId).toList())
                .stream()
                .collect(Collectors.toMap(
                        MapPinCommentRepository.CommentCountProjection::getMapPinId,
                        MapPinCommentRepository.CommentCountProjection::getCommentCount));
        return pins.stream()
                .map(pin -> new MapPinSummaryResponse(
                        pin.getGooglePlaceId(),
                        pin.getLat(),
                        pin.getLng(),
                        pin.getPlaceName(),
                        countsByPinId.getOrDefault(pin.getId(), 0L)))
                .toList();
    }

    public List<MapPinCommentResponse> getComments(Long tripId, String googlePlaceId) {
        accessChecker.requireView(tripId);
        return mapPinRepository.findByTripIdAndGooglePlaceId(tripId, googlePlaceId)
                .map(pin -> toResponses(commentRepository.findAllByMapPinIdOrderByIdAsc(pin.getId())))
                .orElseGet(List::of);
    }

    @Transactional
    public MapPinCommentResponse addComment(Long tripId, String googlePlaceId, AddMapPinCommentRequest request) {
        Long memberId = accessChecker.requireEdit(tripId);
        String content = request.content().strip();
        String placeName = request.placeName().strip();
        MapPin pin = mapPinPersistenceService.findOrCreate(MapPin.builder()
                .tripId(tripId)
                .googlePlaceId(googlePlaceId)
                .lat(request.lat())
                .lng(request.lng())
                .placeName(placeName)
                .createdAt(LocalDateTime.now())
                .build());
        MapPinComment comment = commentRepository.save(MapPinComment.builder()
                .mapPinId(pin.getId())
                .memberId(memberId)
                .content(content)
                .createdAt(LocalDateTime.now())
                .build());
        collaborationEventService.record(
                tripId,
                memberId,
                "MAP_PIN_COMMENT_ADDED",
                "MAP_PIN",
                pin.getId(),
                placeName + " 위치에 댓글이 등록됐습니다.",
                Map.of("placeName", placeName),
                NotificationType.PLACE,
                "지도 댓글"
        );
        return toResponse(comment, memberRepository.findById(memberId).orElse(null));
    }

    @Transactional
    public void deleteComment(Long tripId, String googlePlaceId, Long commentId) {
        Long memberId = accessChecker.requireEdit(tripId);
        MapPin pin = mapPinRepository.findByTripIdAndGooglePlaceId(tripId, googlePlaceId)
                .orElseThrow(() -> new BusinessException(PlaceErrorCode.MAP_PIN_NOT_FOUND));
        MapPinComment comment = commentRepository
                .findByIdAndMapPinIdAndMemberId(commentId, pin.getId(), memberId)
                .orElseThrow(() -> new BusinessException(PlaceErrorCode.MAP_PIN_COMMENT_NOT_FOUND));
        commentRepository.delete(comment);
        collaborationEventService.record(
                tripId,
                memberId,
                "MAP_PIN_COMMENT_DELETED",
                "MAP_PIN",
                pin.getId(),
                pin.getPlaceName() + " 위치의 댓글이 삭제됐습니다.",
                Map.of("placeName", pin.getPlaceName()),
                NotificationType.PLACE,
                "지도 댓글 삭제"
        );
    }

    private List<MapPinCommentResponse> toResponses(List<MapPinComment> comments) {
        if (comments.isEmpty()) {
            return List.of();
        }
        List<Long> memberIds = comments.stream()
                .map(MapPinComment::getMemberId)
                .distinct()
                .toList();
        Map<Long, Member> membersById = memberRepository.findAllById(memberIds).stream()
                .collect(Collectors.toMap(Member::getId, Function.identity()));
        return comments.stream()
                .map(comment -> toResponse(comment, membersById.get(comment.getMemberId())))
                .toList();
    }

    private MapPinCommentResponse toResponse(MapPinComment comment, Member member) {
        return new MapPinCommentResponse(
                comment.getId(),
                comment.getMapPinId(),
                comment.getMemberId(),
                member != null ? member.getNickname() : UNKNOWN_MEMBER_NICKNAME,
                member != null ? member.getProfileImageUrl() : null,
                comment.getContent(),
                comment.getCreatedAt().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
        );
    }
}
