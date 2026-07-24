package back.backend.domain.place.service;

import back.backend.domain.place.dto.request.AddTripPlaceRequest;
import back.backend.domain.collaboration.notification.entity.NotificationType;
import back.backend.domain.collaboration.service.CollaborationEventService;
import back.backend.domain.place.dto.response.TripPlaceResponse;
import back.backend.domain.place.entity.Place;
import back.backend.domain.place.entity.TripPlace;
import back.backend.domain.place.entity.TripPlaceStatus;
import back.backend.domain.place.exception.PlaceErrorCode;
import back.backend.domain.place.repository.PlaceCommentRepository;
import back.backend.domain.place.repository.PlaceCommentRepository.CommentCountProjection;
import back.backend.domain.place.repository.PlaceRepository;
import back.backend.domain.place.repository.TripAccessRepository;
import back.backend.domain.place.repository.TripPlaceRepository;
import back.backend.global.exception.BusinessException;
import back.backend.global.security.SecurityContextAccessor;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TripPlaceService {

    private final PlaceRepository placeRepository;
    private final TripPlaceRepository tripPlaceRepository;
    private final TripAccessRepository tripAccessRepository;
    private final PlaceCommentRepository placeCommentRepository;
    private final SecurityContextAccessor securityContextAccessor;
    private final TripAccessChecker accessChecker;
    private final CollaborationEventService collaborationEventService;

    @Transactional
    public TripPlaceResponse addPlace(Long tripId, AddTripPlaceRequest request) {
        Long memberId = accessChecker.requireEdit(tripId);
        Place place = placeRepository.findByGooglePlaceId(request.googlePlaceId())
                .orElseGet(() -> placeRepository.save(Place.builder()
                        .googlePlaceId(request.googlePlaceId())
                        .name(request.name())
                        .address(request.address())
                        .latitude(BigDecimal.valueOf(request.latitude()))
                        .longitude(BigDecimal.valueOf(request.longitude()))
                        .placeType(request.placeType())
                        .googlePhotoName(request.photoName())
                        .build()));

        if (tripPlaceRepository.existsByTripIdAndPlaceId(tripId, place.getId())) {
            throw new BusinessException(PlaceErrorCode.TRIP_PLACE_ALREADY_EXISTS);
        }

        TripPlace tripPlace = tripPlaceRepository.save(TripPlace.builder()
                .tripId(tripId)
                .place(place)
                .addedBy(memberId)
                .status(TripPlaceStatus.SAVED)
                .build());

        collaborationEventService.record(
                tripId,
                memberId,
                "PLACE_ADDED",
                "TRIP_PLACE",
                tripPlace.getId(),
                request.name() + " 장소가 등록됐습니다.",
                Map.of("placeName", request.name()),
                NotificationType.PLACE,
                "장소 등록"
        );
        return TripPlaceResponse.from(tripPlace);
    }

    public List<TripPlaceResponse> getPlaces(Long tripId, TripPlaceStatus status) {
        accessChecker.requireView(tripId);
        List<TripPlace> tripPlaces = (status == null)
                ? tripPlaceRepository.findAllOrderedByTripId(tripId)
                : tripPlaceRepository.findAllOrderedByTripIdAndStatus(tripId, status);

        List<Long> tripPlaceIds = tripPlaces.stream().map(TripPlace::getId).toList();
        Map<Long, Integer> commentCountMap = placeCommentRepository
                .countByTripPlaceIds(tripPlaceIds)
                .stream()
                .collect(Collectors.toMap(
                        CommentCountProjection::getTripPlaceId,
                        p -> p.getCommentCount().intValue()
                ));

        return tripPlaces.stream()
                .map(tp -> TripPlaceResponse.from(tp, commentCountMap.getOrDefault(tp.getId(), 0)))
                .toList();
    }

    @Transactional
    public void deletePlace(Long tripId, Long tripPlaceId) {
        Long memberId = accessChecker.requireEdit(tripId);
        TripPlace tripPlace = tripPlaceRepository.findByIdAndTripId(tripPlaceId, tripId)
                .orElseThrow(() -> new BusinessException(PlaceErrorCode.TRIP_PLACE_NOT_FOUND));
        String placeName = tripPlace.getPlace().getName();
        tripPlaceRepository.delete(tripPlace);
        collaborationEventService.record(
                tripId,
                memberId,
                "PLACE_DELETED",
                "TRIP_PLACE",
                tripPlaceId,
                placeName + " 장소가 삭제됐습니다.",
                Map.of("placeName", placeName),
                NotificationType.PLACE,
                "장소 삭제"
        );
    }

    public boolean canEdit(Long tripId) {
        var principal = securityContextAccessor.getCurrentPrincipal();
        if (principal.isEmpty()) {
            accessChecker.requireView(tripId);
            return false;
        }
        return tripAccessRepository.canEdit(tripId, principal.get().getMemberId());
    }
}
