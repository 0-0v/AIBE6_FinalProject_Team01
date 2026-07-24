package back.backend.domain.trip.service;

import back.backend.domain.trip.dto.GuestAccessGrant;
import back.backend.domain.trip.dto.TripResponse;
import back.backend.domain.trip.entity.GuestSession;
import back.backend.domain.trip.entity.Trip;
import back.backend.domain.trip.entity.TripGuestMember;
import back.backend.domain.trip.entity.TripInvitation;
import back.backend.domain.trip.entity.TripMember;
import back.backend.domain.trip.entity.TripStatus;
import back.backend.domain.trip.exception.TripErrorCode;
import back.backend.domain.trip.repository.GuestSessionRepository;
import back.backend.domain.trip.repository.TripGuestMemberRepository;
import back.backend.domain.trip.repository.TripInvitationRepository;
import back.backend.domain.trip.repository.TripMemberRepository;
import back.backend.domain.trip.repository.TripRepository;
import back.backend.global.exception.BusinessException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class GuestTripAccessService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final TripInvitationRepository invitationRepository;
    private final TripRepository tripRepository;
    private final GuestSessionRepository guestSessionRepository;
    private final TripGuestMemberRepository tripGuestMemberRepository;
    private final TripMemberRepository tripMemberRepository;
    private final GuestTokenHasher tokenHasher;

    public GuestTripAccessService(
            TripInvitationRepository invitationRepository,
            TripRepository tripRepository,
            GuestSessionRepository guestSessionRepository,
            TripGuestMemberRepository tripGuestMemberRepository,
            TripMemberRepository tripMemberRepository,
            GuestTokenHasher tokenHasher
    ) {
        this.invitationRepository = invitationRepository;
        this.tripRepository = tripRepository;
        this.guestSessionRepository = guestSessionRepository;
        this.tripGuestMemberRepository = tripGuestMemberRepository;
        this.tripMemberRepository = tripMemberRepository;
        this.tokenHasher = tokenHasher;
    }

    @Transactional
    public GuestAccessGrant accept(String inviteCode) {
        return accept(inviteCode, null);
    }

    @Transactional
    public GuestAccessGrant accept(String inviteCode, String existingToken) {
        LocalDateTime now = LocalDateTime.now();
        TripInvitation invitation = invitationRepository.findByInviteCode(inviteCode)
                .filter(value -> value.isUsable(now))
                .orElseThrow(() -> new BusinessException(TripErrorCode.INVITATION_NOT_FOUND));
        Trip trip = findActiveTrip(invitation.getTripId());

        GuestSession existingSession = findUsableSessionOrNull(existingToken, now);
        if (existingSession != null) {
            if (!tripGuestMemberRepository.existsByTripIdAndGuestSessionId(trip.getId(), existingSession.getId())) {
                tripGuestMemberRepository.save(TripGuestMember.viewer(trip.getId(), existingSession.getId()));
            }
            return new GuestAccessGrant(
                    TripResponse.from(trip), existingToken, existingSession.getExpiresAt());
        }

        String token = generateToken();
        GuestSession session = guestSessionRepository.save(
                GuestSession.create(tokenHasher.hash(token), invitation.getExpiresAt()));
        tripGuestMemberRepository.save(TripGuestMember.viewer(trip.getId(), session.getId()));

        return new GuestAccessGrant(TripResponse.from(trip), token, session.getExpiresAt());
    }

    public TripResponse getTrip(Long tripId, String token) {
        GuestSession session = findUsableSession(token);
        if (!tripGuestMemberRepository.existsByTripIdAndGuestSessionId(tripId, session.getId())) {
            throw new BusinessException(TripErrorCode.GUEST_ACCESS_DENIED);
        }
        return TripResponse.from(findActiveTrip(tripId));
    }

    public boolean canView(Long tripId, String token) {
        if (token == null || token.isBlank()) {
            return false;
        }
        return guestSessionRepository.findByTokenHash(tokenHasher.hash(token))
                .filter(session -> session.isUsable(LocalDateTime.now()))
                .filter(session -> tripGuestMemberRepository
                        .existsByTripIdAndGuestSessionId(tripId, session.getId()))
                .isPresent();
    }

    @Transactional
    public boolean claimIfPresent(Long memberId, String token) {
        if (token == null || token.isBlank()) {
            return false;
        }
        return guestSessionRepository.findByTokenHash(tokenHasher.hash(token))
                .filter(session -> session.isUsable(LocalDateTime.now()))
                .map(session -> claim(memberId, session))
                .orElse(false);
    }

    private boolean claim(Long memberId, GuestSession session) {
        for (TripGuestMember guestMember : tripGuestMemberRepository.findAllByGuestSessionId(session.getId())) {
            if (!tripMemberRepository.existsByTripIdAndMemberId(guestMember.getTripId(), memberId)) {
                tripMemberRepository.save(TripMember.viewer(guestMember.getTripId(), memberId));
            }
        }
        tripGuestMemberRepository.deleteAllByGuestSessionId(session.getId());
        session.claim(LocalDateTime.now());
        return true;
    }

    private GuestSession findUsableSession(String token) {
        if (token == null || token.isBlank()) {
            throw new BusinessException(TripErrorCode.GUEST_ACCESS_DENIED);
        }
        return guestSessionRepository.findByTokenHash(tokenHasher.hash(token))
                .filter(session -> session.isUsable(LocalDateTime.now()))
                .orElseThrow(() -> new BusinessException(TripErrorCode.GUEST_ACCESS_DENIED));
    }

    private GuestSession findUsableSessionOrNull(String token, LocalDateTime now) {
        if (token == null || token.isBlank()) {
            return null;
        }
        return guestSessionRepository.findByTokenHash(tokenHasher.hash(token))
                .filter(session -> session.isUsable(now))
                .orElse(null);
    }

    private Trip findActiveTrip(Long tripId) {
        return tripRepository.findByIdAndStatusNot(tripId, TripStatus.CANCELLED)
                .orElseThrow(() -> new BusinessException(TripErrorCode.TRIP_NOT_FOUND));
    }

    private String generateToken() {
        byte[] bytes = new byte[32];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
