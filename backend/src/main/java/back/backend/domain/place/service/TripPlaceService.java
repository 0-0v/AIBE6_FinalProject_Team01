package back.backend.domain.place.service;

import back.backend.domain.place.dto.request.AddTripPlaceRequest;
import back.backend.domain.place.dto.request.UpdateNoteRequest;
import back.backend.domain.place.dto.request.UpdateStatusRequest;
import back.backend.domain.place.dto.response.TripPlaceResponse;
import back.backend.domain.place.entity.Place;
import back.backend.domain.place.entity.TripPlace;
import back.backend.domain.place.entity.TripPlaceStatus;
import back.backend.domain.place.exception.PlaceErrorCode;
import back.backend.domain.place.repository.PlaceRepository;
import back.backend.domain.place.repository.TripPlaceRepository;
import back.backend.global.exception.BusinessException;
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

    // TODO: A 도메인 인증 완성 후 SecurityContextAccessor에서 멤버 ID 추출
    private static final Long TEMP_MEMBER_ID = 1L;

    @Transactional
    public TripPlaceResponse addPlace(Long tripId, AddTripPlaceRequest request) {
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
                .addedBy(TEMP_MEMBER_ID)
                .status(TripPlaceStatus.CANDIDATE)
                .userNote(request.userNote())
                .build());

        return TripPlaceResponse.from(tripPlace);
    }

    public List<TripPlaceResponse> getPlaces(Long tripId, TripPlaceStatus status) {
        List<TripPlace> tripPlaces = (status == null)
                ? tripPlaceRepository.findByTripId(tripId)
                : tripPlaceRepository.findByTripIdAndStatus(tripId, status);
        return tripPlaces.stream().map(TripPlaceResponse::from).toList();
    }

    @Transactional
    public void deletePlace(Long tripId, Long tripPlaceId) {
        TripPlace tripPlace = tripPlaceRepository.findByIdAndTripId(tripPlaceId, tripId)
                .orElseThrow(() -> new BusinessException(PlaceErrorCode.TRIP_PLACE_NOT_FOUND));
        tripPlaceRepository.delete(tripPlace);
    }

    @Transactional
    public TripPlaceResponse updateStatus(Long tripId, Long tripPlaceId, UpdateStatusRequest request) {
        TripPlace tripPlace = tripPlaceRepository.findByIdAndTripId(tripPlaceId, tripId)
                .orElseThrow(() -> new BusinessException(PlaceErrorCode.TRIP_PLACE_NOT_FOUND));
        tripPlace.updateStatus(request.status());
        return TripPlaceResponse.from(tripPlace);
    }

    @Transactional
    public TripPlaceResponse updateNote(Long tripId, Long tripPlaceId, UpdateNoteRequest request) {
        TripPlace tripPlace = tripPlaceRepository.findByIdAndTripId(tripPlaceId, tripId)
                .orElseThrow(() -> new BusinessException(PlaceErrorCode.TRIP_PLACE_NOT_FOUND));
        tripPlace.updateNote(request.userNote());
        return TripPlaceResponse.from(tripPlace);
    }
}
