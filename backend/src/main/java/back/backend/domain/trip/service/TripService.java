package back.backend.domain.trip.service;

import back.backend.domain.member.repository.MemberRepository;
import back.backend.domain.trip.dto.TripRequest;
import back.backend.domain.trip.dto.TripResponse;
import back.backend.domain.trip.entity.Trip;
import back.backend.domain.trip.entity.TripMember;
import back.backend.domain.trip.exception.TripErrorCode;
import back.backend.domain.trip.repository.TripMemberRepository;
import back.backend.domain.trip.repository.TripRepository;
import back.backend.global.exception.BusinessException;
import back.backend.global.exception.CommonErrorCode;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class TripService {

    private final TripRepository tripRepository;
    private final TripMemberRepository tripMemberRepository;
    private final MemberRepository memberRepository;

    public TripService(TripRepository tripRepository, TripMemberRepository tripMemberRepository,
                       MemberRepository memberRepository) {
        this.tripRepository = tripRepository;
        this.tripMemberRepository = tripMemberRepository;
        this.memberRepository = memberRepository;
    }

    @Transactional
    public TripResponse create(Long memberId, TripRequest request) {
        if (!memberRepository.existsById(memberId)) {
            throw new BusinessException(CommonErrorCode.NOT_FOUND);
        }
        Trip trip = saveValidTrip(memberId, request);
        tripMemberRepository.save(TripMember.owner(trip.getId(), memberId));
        return TripResponse.from(trip);
    }

    public List<TripResponse> getMyTrips(Long memberId) {
        return tripRepository.findAllByOwnerIdOrderByCreatedAtDesc(memberId).stream()
                .map(TripResponse::from)
                .toList();
    }

    public TripResponse get(Long memberId, Long tripId) {
        return TripResponse.from(findOwnedTrip(memberId, tripId));
    }

    @Transactional
    public TripResponse update(Long memberId, Long tripId, TripRequest request) {
        Trip trip = findOwnedTrip(memberId, tripId);
        try {
            trip.update(request.title(), request.companionType(), request.normalizedTravelStyles(),
                    request.destination(), request.startDate(), request.endDate());
        } catch (IllegalArgumentException exception) {
            throw new BusinessException(TripErrorCode.INVALID_TRIP, exception.getMessage());
        }
        return TripResponse.from(trip);
    }

    @Transactional
    public void delete(Long memberId, Long tripId) {
        Trip trip = findOwnedTrip(memberId, tripId);
        tripMemberRepository.deleteAllByTripId(tripId);
        tripRepository.delete(trip);
    }

    private Trip saveValidTrip(Long memberId, TripRequest request) {
        try {
            return tripRepository.save(Trip.create(memberId, request.title(), request.companionType(),
                    request.normalizedTravelStyles(), request.destination(), request.startDate(), request.endDate()));
        } catch (IllegalArgumentException exception) {
            throw new BusinessException(TripErrorCode.INVALID_TRIP, exception.getMessage());
        }
    }

    private Trip findOwnedTrip(Long memberId, Long tripId) {
        return tripRepository.findByIdAndOwnerId(tripId, memberId)
                .orElseThrow(() -> new BusinessException(TripErrorCode.TRIP_NOT_FOUND));
    }
}
