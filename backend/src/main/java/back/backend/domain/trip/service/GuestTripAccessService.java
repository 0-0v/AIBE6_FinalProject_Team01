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
import back.backend.global.realtime.RealtimeEvent;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import org.springframework.stereotype.Service;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class GuestTripAccessService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final long GUEST_ACCESS_DAYS = 7;

    private final TripInvitationRepository invitationRepository;
    private final TripRepository tripRepository;
    private final GuestSessionRepository guestSessionRepository;
    private final TripGuestMemberRepository tripGuestMemberRepository;
    private final TripMemberRepository tripMemberRepository;
    private final GuestTokenHasher tokenHasher;
    private final ApplicationEventPublisher eventPublisher;

    public GuestTripAccessService(
            TripInvitationRepository invitationRepository,
            TripRepository tripRepository,
            GuestSessionRepository guestSessionRepository,
            TripGuestMemberRepository tripGuestMemberRepository,
            TripMemberRepository tripMemberRepository,
            GuestTokenHasher tokenHasher,
            ApplicationEventPublisher eventPublisher
    ) {
        this.invitationRepository = invitationRepository;
        this.tripRepository = tripRepository;
        this.guestSessionRepository = guestSessionRepository;
        this.tripGuestMemberRepository = tripGuestMemberRepository;
        this.tripMemberRepository = tripMemberRepository;
        this.tokenHasher = tokenHasher;
        this.eventPublisher = eventPublisher;
    }

    @Transactional
    public GuestAccessGrant accept(String inviteCode) {
        return accept(inviteCode, null, null);
    }

    @Transactional
    public GuestAccessGrant accept(String inviteCode, String accessCode, String existingToken) {
        LocalDateTime now = LocalDateTime.now();
        TripInvitation invitation = invitationRepository.findByInviteCode(inviteCode)
                .orElseThrow(() -> new BusinessException(TripErrorCode.INVITATION_NOT_FOUND));

        GuestSession existingSession = findUsableSessionOrNull(existingToken, now);
        if (existingSession != null && tripGuestMemberRepository.existsByTripIdAndGuestSessionId(
                invitation.getTripId(), existingSession.getId())) {
            Trip trip = findActiveTrip(invitation.getTripId());
            return new GuestAccessGrant(
                    toResponse(trip), existingToken, existingSession.getExpiresAt());
        }

        if (!invitation.isAccessCodeUsable(accessCode, now)) {
            throw new BusinessException(TripErrorCode.INVITATION_NOT_FOUND);
        }
        Trip trip = findActiveTrip(invitation.getTripId());

        if (existingSession != null) {
            existingSession.extendUntil(now.plusDays(GUEST_ACCESS_DAYS));
            tripGuestMemberRepository.save(TripGuestMember.guest(trip.getId(), existingSession.getId()));
            return new GuestAccessGrant(toResponse(trip), existingToken, existingSession.getExpiresAt());
        }

        String token = generateToken();
        GuestSession session = guestSessionRepository.save(
                GuestSession.create(tokenHasher.hash(token), now.plusDays(GUEST_ACCESS_DAYS)));
        tripGuestMemberRepository.save(TripGuestMember.guest(trip.getId(), session.getId()));

        return new GuestAccessGrant(toResponse(trip), token, session.getExpiresAt());
    }

    public TripResponse getTrip(Long tripId, String token) {
        GuestSession session = findUsableSession(token);
        if (!tripGuestMemberRepository.existsByTripIdAndGuestSessionId(tripId, session.getId())) {
            throw new BusinessException(TripErrorCode.GUEST_ACCESS_DENIED);
        }
        return toResponse(findActiveTrip(tripId));
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

    @Transactional
    public void claimInvitation(Long memberId, String inviteCode, String token) {
        LocalDateTime now = LocalDateTime.now();
        TripInvitation invitation = invitationRepository.findByInviteCode(inviteCode)
                .orElseThrow(() -> new BusinessException(TripErrorCode.INVITATION_NOT_FOUND));
        GuestSession session = findUsableSessionOrNull(token, now);
        boolean alreadyAcceptedAsGuest = session != null && tripGuestMemberRepository
                .existsByTripIdAndGuestSessionId(invitation.getTripId(), session.getId());
        if (!alreadyAcceptedAsGuest && !invitation.isLinkUsable(now)) {
            throw new BusinessException(TripErrorCode.INVITATION_NOT_FOUND);
        }
        Trip trip = findActiveTrip(invitation.getTripId());

        if (!tripMemberRepository.existsByTripIdAndMemberId(trip.getId(), memberId)) {
            tripMemberRepository.save(TripMember.member(trip.getId(), memberId));
            eventPublisher.publishEvent(RealtimeEvent.tripMembers(trip.getId(), memberId));
        }
        claimIfPresent(memberId, token);
    }

    private boolean claim(Long memberId, GuestSession session) {
        for (TripGuestMember guestMember : tripGuestMemberRepository.findAllByGuestSessionId(session.getId())) {
            if (!tripMemberRepository.existsByTripIdAndMemberId(guestMember.getTripId(), memberId)) {
                tripMemberRepository.save(TripMember.member(guestMember.getTripId(), memberId));
                eventPublisher.publishEvent(RealtimeEvent.tripMembers(guestMember.getTripId(), memberId));
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

    private TripResponse toResponse(Trip trip) {
        return TripResponse.from(trip, tripMemberRepository.countByTripId(trip.getId()));
    }

    private String generateToken() {
        byte[] bytes = new byte[32];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
