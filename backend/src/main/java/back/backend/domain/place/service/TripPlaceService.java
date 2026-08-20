package back.backend.domain.place.service;

import back.backend.domain.place.dto.request.AddTripPlaceRequest;
import back.backend.domain.collaboration.notification.entity.NotificationType;
import back.backend.domain.collaboration.service.CollaborationEventService;
import back.backend.domain.itinerary.repository.ItineraryDayRepository;
import back.backend.domain.place.dto.response.TripPlaceResponse;
import back.backend.domain.place.entity.Place;
import back.backend.domain.place.entity.PlaceCategory;
import back.backend.domain.place.entity.TripPlace;
import back.backend.domain.place.entity.TripPlaceStatus;
import back.backend.domain.place.exception.PlaceErrorCode;
import back.backend.domain.place.repository.PlaceCommentRepository;
import back.backend.domain.place.repository.PlaceRepository;
import back.backend.domain.place.repository.PlaceVoteRequestRepository;
import back.backend.domain.place.repository.PlaceCommentRepository.CommentCountProjection;
import back.backend.domain.trip.repository.TripMemberRepository;
import back.backend.domain.place.repository.TripPlaceRepository;
import back.backend.global.exception.BusinessException;
import back.backend.global.exception.DataIntegrityConstraintMatcher;
import back.backend.global.security.SecurityContextAccessor;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TripPlaceService {

    private final TripPlaceRepository tripPlaceRepository;
    private final PlaceRepository placeRepository;
    private final ItineraryDayRepository itineraryDayRepository;
    private final TripMemberRepository tripMemberRepository;
    private final PlaceCommentRepository placeCommentRepository;
    private final PlaceVoteRequestRepository placeVoteRequestRepository;
    private final SecurityContextAccessor securityContextAccessor;
    private final TripAccessChecker accessChecker;
    private final PlaceCategoryService categoryService;
    private final PlacePersistenceService placePersistenceService;
    private final PlaceStyleRelationService placeStyleRelationService;
    private final CollaborationEventService collaborationEventService;
    private final GooglePlaceContentRefreshService googlePlaceContentRefreshService;

    @Transactional
    public TripPlaceResponse addPlace(Long tripId, AddTripPlaceRequest request) {
        Long memberId = accessChecker.requireEdit(tripId);
        Place place = placeRepository.findByGooglePlaceId(request.googlePlaceId())
                .map(existing -> {
                    if (!googlePlaceContentRefreshService.ensureFresh(existing)) {
                        throw new BusinessException(
                                PlaceErrorCode.PLACE_SEARCH_EXTERNAL_API_ERROR
                        );
                    }
                    return existing;
                })
                .orElseGet(() -> {
                    Place verified = googlePlaceContentRefreshService
                            .fetchVerified(request.googlePlaceId())
                            .orElseThrow(() -> new BusinessException(
                                    PlaceErrorCode.PLACE_SEARCH_EXTERNAL_API_ERROR
                            ));
                    return placePersistenceService.findOrCreate(verified);
                });

        Optional<TripPlace> existingTripPlace =
                tripPlaceRepository.findByTripIdAndPlaceId(tripId, place.getId());
        if (existingTripPlace.isPresent()) {
            TripPlace tripPlace = existingTripPlace.get();
            if (tripPlace.getStatus() != TripPlaceStatus.REJECTED) {
                throw new BusinessException(PlaceErrorCode.TRIP_PLACE_ALREADY_EXISTS);
            }
            tripPlace.updateStatus(TripPlaceStatus.SAVED);
            placeStyleRelationService.saveCategoryRelations(
                    place,
                    tripPlace.getCategory().getCategoryType()
            );
            recordPlaceAdded(tripId, memberId, tripPlace, request.name());
            return TripPlaceResponse.from(tripPlace);
        }

        PlaceCategory category = categoryService.recommend(
                tripId,
                request.name(),
                request.placeType(),
                request.placeTypes()
        );
        TripPlace tripPlace;
        try {
            tripPlace = tripPlaceRepository.saveAndFlush(TripPlace.builder()
                    .tripId(tripId)
                    .place(place)
                    .category(category)
                    .addedBy(memberId)
                    .status(TripPlaceStatus.SAVED)
                    .build());
        } catch (DataIntegrityViolationException exception) {
            if (isTripPlaceDuplicate(exception)) {
                throw new BusinessException(PlaceErrorCode.TRIP_PLACE_ALREADY_EXISTS);
            }
            throw exception;
        }

        placeStyleRelationService.saveCategoryRelations(
                place,
                category.getCategoryType()
        );
        recordPlaceAdded(tripId, memberId, tripPlace, request.name());
        return TripPlaceResponse.from(tripPlace);
    }

    private boolean isTripPlaceDuplicate(Throwable throwable) {
        return DataIntegrityConstraintMatcher.containsConstraint(
                throwable,
                "uk_trip_places_trip_place"
        );
    }

    private void recordPlaceAdded(
            Long tripId,
            Long memberId,
            TripPlace tripPlace,
            String placeName
    ) {
        collaborationEventService.record(
                tripId,
                memberId,
                "PLACE_ADDED",
                "TRIP_PLACE",
                tripPlace.getId(),
                placeName + " 장소가 등록됐습니다.",
                Map.of("placeName", placeName),
                NotificationType.PLACE,
                "장소 등록"
        );
    }

    @Transactional
    public TripPlaceResponse updateCategory(
            Long tripId,
            Long tripPlaceId,
            Long categoryId
    ) {
        Long memberId = accessChecker.requireEdit(tripId);
        TripPlace tripPlace = tripPlaceRepository.findByIdAndTripId(tripPlaceId, tripId)
                .orElseThrow(() -> new BusinessException(PlaceErrorCode.TRIP_PLACE_NOT_FOUND));
        var category = categoryService.findCategory(tripId, categoryId);
        tripPlace.updateCategory(category);
        collaborationEventService.record(
                tripId,
                memberId,
                "TRIP_PLACE_CATEGORY_UPDATED",
                "TRIP_PLACE",
                tripPlaceId,
                tripPlace.getPlace().getName() + " 장소의 카테고리가 변경됐습니다.",
                Map.of(
                        "placeName", tripPlace.getPlace().getName(),
                        "categoryName", category.getName()
                ),
                NotificationType.PLACE,
                "장소 카테고리 변경"
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
        itineraryDayRepository.findAllByTripIdAndDepartureTripPlaceId(tripId, tripPlaceId)
                .forEach(day -> day.clearDeparture());
        var relatedVotes = placeVoteRequestRepository
                .findAllByTripPlaceIdForUpdate(tripPlaceId);
        if (!relatedVotes.isEmpty()) {
            placeVoteRequestRepository.deleteAllInBatch(relatedVotes);
        }
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
        return tripMemberRepository.existsByTripIdAndMemberId(
                tripId, principal.get().getMemberId());
    }
}
