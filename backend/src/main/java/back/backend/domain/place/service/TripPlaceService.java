package back.backend.domain.place.service;

import back.backend.domain.place.dto.request.AddTripPlaceRequest;
import back.backend.domain.place.dto.request.UpdateNoteRequest;
import back.backend.domain.place.dto.request.UpdatePriorityRequest;
import back.backend.domain.place.dto.request.UpdateStatusRequest;
import back.backend.domain.place.dto.response.TripPlaceResponse;
import back.backend.domain.place.dto.response.TripPlaceAccessResponse;
import back.backend.domain.place.entity.Place;
import back.backend.domain.place.entity.TripPlace;
import back.backend.domain.place.entity.TripPlaceStatus;
import back.backend.domain.place.exception.PlaceErrorCode;
import back.backend.domain.place.repository.PlaceRepository;
import back.backend.domain.place.repository.TripAccessRepository;
import back.backend.domain.place.repository.TripPlaceRepository;
import back.backend.global.exception.BusinessException;
import back.backend.global.exception.CommonErrorCode;
import back.backend.global.security.SecurityContextAccessor;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TripPlaceService {

    private final PlaceRepository placeRepository;
    private final TripPlaceRepository tripPlaceRepository;
    private final TripAccessRepository tripAccessRepository;
    private final SecurityContextAccessor securityContextAccessor;

    @Transactional
    public TripPlaceResponse addPlace(Long tripId, AddTripPlaceRequest request) {
        Long memberId = requireEditAccess(tripId);
        Place place = placeRepository.findByGooglePlaceId(request.googlePlaceId())
                .orElseGet(() -> placeRepository.save(Place.builder()
                        .googlePlaceId(request.googlePlaceId())
                        .name(request.name())
                        .address(request.address())
                        .latitude(request.latitude())
                        .longitude(request.longitude())
                        .placeType(request.placeType())
                        .imageUrl(request.imageUrl())
                        .build()));

        if (tripPlaceRepository.existsByTripIdAndPlaceId(tripId, place.getId())) {
            throw new BusinessException(PlaceErrorCode.TRIP_PLACE_ALREADY_EXISTS);
        }

        TripPlace tripPlace = tripPlaceRepository.save(TripPlace.builder()
                .tripId(tripId)
                .place(place)
                .addedBy(memberId)
                .status(TripPlaceStatus.CANDIDATE)
                .userNote(request.userNote())
                .build());

        return TripPlaceResponse.from(tripPlace);
    }

    public List<TripPlaceResponse> getPlaces(Long tripId, TripPlaceStatus status) {
        requireViewAccess(tripId);
        List<TripPlace> tripPlaces = (status == null)
                ? tripPlaceRepository.findAllOrderedByTripId(tripId)
                : tripPlaceRepository.findAllOrderedByTripIdAndStatus(tripId, status);
        return tripPlaces.stream().map(TripPlaceResponse::from).toList();
    }

    public TripPlaceAccessResponse getAccess(Long tripId) {
        Long memberId = securityContextAccessor.getCurrentMemberId();
        if (!tripAccessRepository.canView(tripId, memberId)) {
            throw new BusinessException(CommonErrorCode.FORBIDDEN);
        }
        return new TripPlaceAccessResponse(tripAccessRepository.canEdit(tripId, memberId));
    }

    @Transactional
    public void deletePlace(Long tripId, Long tripPlaceId) {
        requireEditAccess(tripId);
        TripPlace tripPlace = tripPlaceRepository.findByIdAndTripId(tripPlaceId, tripId)
                .orElseThrow(() -> new BusinessException(PlaceErrorCode.TRIP_PLACE_NOT_FOUND));
        tripPlaceRepository.delete(tripPlace);
    }

    @Transactional
    public TripPlaceResponse updateStatus(Long tripId, Long tripPlaceId, UpdateStatusRequest request) {
        requireEditAccess(tripId);
        TripPlace tripPlace = tripPlaceRepository.findByIdAndTripId(tripPlaceId, tripId)
                .orElseThrow(() -> new BusinessException(PlaceErrorCode.TRIP_PLACE_NOT_FOUND));
        tripPlace.updateStatus(request.status());
        return TripPlaceResponse.from(tripPlace);
    }

    @Transactional
    public TripPlaceResponse updateNote(Long tripId, Long tripPlaceId, UpdateNoteRequest request) {
        requireEditAccess(tripId);
        TripPlace tripPlace = tripPlaceRepository.findByIdAndTripId(tripPlaceId, tripId)
                .orElseThrow(() -> new BusinessException(PlaceErrorCode.TRIP_PLACE_NOT_FOUND));
        tripPlace.updateNote(request.userNote());
        return TripPlaceResponse.from(tripPlace);
    }

    @Transactional
    public TripPlaceResponse updatePriority(Long tripId, Long tripPlaceId, UpdatePriorityRequest request) {
        requireEditAccess(tripId);
        TripPlace tripPlace = tripPlaceRepository.findByIdAndTripId(tripPlaceId, tripId)
                .orElseThrow(() -> new BusinessException(PlaceErrorCode.TRIP_PLACE_NOT_FOUND));
        tripPlace.updatePriority(request.priority());
        return TripPlaceResponse.from(tripPlace);
    }

    private void requireViewAccess(Long tripId) {
        Long memberId = securityContextAccessor.getCurrentMemberId();
        if (!tripAccessRepository.canView(tripId, memberId)) {
            throw new BusinessException(CommonErrorCode.FORBIDDEN);
        }
    }

    private Long requireEditAccess(Long tripId) {
        Long memberId = securityContextAccessor.getCurrentMemberId();
        if (!tripAccessRepository.canEdit(tripId, memberId)) {
            throw new BusinessException(CommonErrorCode.FORBIDDEN);
        }
        return memberId;
    }
}
