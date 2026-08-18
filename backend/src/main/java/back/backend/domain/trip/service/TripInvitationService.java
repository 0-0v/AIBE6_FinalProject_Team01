package back.backend.domain.trip.service;

import back.backend.domain.trip.dto.TripInvitationResponse;
import back.backend.domain.trip.dto.TripResponse;
import back.backend.domain.trip.entity.Trip;
import back.backend.domain.trip.entity.TripInvitation;
import back.backend.domain.trip.entity.TripStatus;
import back.backend.domain.trip.exception.TripErrorCode;
import back.backend.domain.trip.repository.TripInvitationRepository;
import back.backend.domain.trip.repository.TripMemberRepository;
import back.backend.domain.trip.repository.TripRepository;
import back.backend.global.exception.BusinessException;
import java.time.LocalDateTime;
import java.security.SecureRandom;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class TripInvitationService {
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private final TripRepository tripRepository;
    private final TripInvitationRepository invitationRepository;
    private final TripMemberRepository tripMemberRepository;

    public TripInvitationService(
            TripRepository tripRepository,
            TripInvitationRepository invitationRepository,
            TripMemberRepository tripMemberRepository) {
        this.tripRepository = tripRepository;
        this.invitationRepository = invitationRepository;
        this.tripMemberRepository = tripMemberRepository;
    }

    @Transactional
    public TripInvitationResponse create(Long memberId, Long tripId) {
        TripInvitationPolicy.requireOpen(findJoinedTrip(memberId, tripId));
        LocalDateTime now = LocalDateTime.now();
        TripInvitation invitation = invitationRepository.save(TripInvitation.create(
                tripId, UUID.randomUUID().toString().replace("-", ""), generateAccessCode(), memberId,
                now.plusMinutes(5), now.plusDays(7)));
        return new TripInvitationResponse(invitation.getAccessCode(), invitation.getInviteCode(),
                invitation.getCodeExpiresAt(), invitation.getExpiresAt());
    }

    public TripResponse preview(String inviteCode) {
        TripInvitation invitation = invitationRepository.findByInviteCode(inviteCode)
                .filter(value -> value.isLinkUsable(LocalDateTime.now()))
                .orElseThrow(() -> new BusinessException(TripErrorCode.INVITATION_NOT_FOUND));
        Trip trip = tripRepository.findByIdAndStatusNot(invitation.getTripId(), TripStatus.CANCELLED)
                .orElseThrow(() -> new BusinessException(TripErrorCode.TRIP_NOT_FOUND));
        TripInvitationPolicy.requireOpen(trip);
        return TripResponse.from(trip, tripMemberRepository.countByTripId(invitation.getTripId()));
    }

    private Trip findJoinedTrip(Long memberId, Long tripId) {
        return tripRepository.findByIdAndMemberIdAndStatusNot(tripId, memberId, TripStatus.CANCELLED)
                .orElseThrow(() -> new BusinessException(TripErrorCode.TRIP_NOT_FOUND));
    }

    private String generateAccessCode() {
        String code;
        do {
            code = String.format("%06d", SECURE_RANDOM.nextInt(1_000_000));
        } while (invitationRepository.existsByAccessCode(code));
        return code;
    }
}
