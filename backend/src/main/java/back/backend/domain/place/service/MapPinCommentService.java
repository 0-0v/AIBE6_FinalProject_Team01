package back.backend.domain.place.service;

import back.backend.domain.collaboration.notification.entity.NotificationType;
import back.backend.domain.collaboration.service.CollaborationEventService;
import back.backend.domain.place.dto.request.AddMapPinCommentRequest;
import back.backend.domain.place.dto.response.MapPinCommentResponse;
import back.backend.domain.place.dto.response.MapPinSummaryResponse;
import back.backend.domain.place.entity.MapPin;
import back.backend.domain.place.entity.MapPinComment;
import back.backend.domain.place.repository.MapPinCommentRepository;
import back.backend.domain.place.repository.MapPinRepository;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MapPinCommentService {

    private final MapPinRepository mapPinRepository;
    private final MapPinCommentRepository commentRepository;
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
                .map(pin -> commentRepository.findAllByMapPinIdOrderByIdAsc(pin.getId())
                        .stream()
                        .map(this::toResponse)
                        .toList())
                .orElseGet(List::of);
    }

    @Transactional
    public MapPinCommentResponse addComment(Long tripId, String googlePlaceId, AddMapPinCommentRequest request) {
        Long memberId = accessChecker.requireEdit(tripId);
        MapPin pin = findOrCreatePin(tripId, googlePlaceId, request);
        MapPinComment comment = commentRepository.save(MapPinComment.builder()
                .mapPinId(pin.getId())
                .memberId(memberId)
                .content(request.content())
                .createdAt(LocalDateTime.now())
                .build());
        collaborationEventService.record(
                tripId,
                memberId,
                "MAP_PIN_COMMENT_ADDED",
                "MAP_PIN",
                pin.getId(),
                request.placeName() + " 위치에 댓글이 등록됐습니다.",
                Map.of("placeName", request.placeName()),
                NotificationType.PLACE,
                "지도 댓글"
        );
        return toResponse(comment);
    }

    private MapPin findOrCreatePin(Long tripId, String googlePlaceId, AddMapPinCommentRequest request) {
        return mapPinRepository.findByTripIdAndGooglePlaceId(tripId, googlePlaceId)
                .orElseGet(() -> {
                    try {
                        return mapPinRepository.save(MapPin.builder()
                                .tripId(tripId)
                                .googlePlaceId(googlePlaceId)
                                .lat(request.lat())
                                .lng(request.lng())
                                .placeName(request.placeName())
                                .createdAt(LocalDateTime.now())
                                .build());
                    } catch (DataIntegrityViolationException e) {
                        return mapPinRepository.findByTripIdAndGooglePlaceId(tripId, googlePlaceId)
                                .orElseThrow(() -> e);
                    }
                });
    }

    private MapPinCommentResponse toResponse(MapPinComment comment) {
        return new MapPinCommentResponse(
                comment.getId(),
                comment.getMapPinId(),
                comment.getMemberId(),
                comment.getContent(),
                comment.getCreatedAt().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
        );
    }
}
