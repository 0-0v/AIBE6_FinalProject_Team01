package back.backend.domain.trip.service;

import back.backend.domain.auth.service.SmtpEmailClient;
import back.backend.domain.member.entity.Member;
import back.backend.domain.member.entity.MemberStatus;
import back.backend.domain.member.repository.MemberRepository;
import back.backend.domain.trip.dto.TripEmailInvitationAvailabilityResponse;
import back.backend.domain.trip.entity.Trip;
import back.backend.domain.trip.entity.TripMember;
import back.backend.domain.trip.entity.TripStatus;
import back.backend.domain.trip.exception.TripErrorCode;
import back.backend.domain.trip.repository.TripMemberRepository;
import back.backend.domain.trip.repository.TripRepository;
import back.backend.global.config.FrontendProperties;
import back.backend.global.exception.BusinessException;
import back.backend.global.realtime.RealtimeEvent;
import back.backend.global.redis.RedisValueService;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.util.Base64;
import java.util.LinkedHashSet;
import java.util.List;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.UriComponentsBuilder;

@Service
@Transactional(readOnly = true)
public class TripEmailInvitationService {
    private static final Duration EXPIRATION = Duration.ofDays(7);
    private static final String KEY_PREFIX = "trip:email-invitation:";
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final TripRepository tripRepository;
    private final TripMemberRepository tripMemberRepository;
    private final MemberRepository memberRepository;
    private final RedisValueService redisValueService;
    private final SmtpEmailClient emailClient;
    private final FrontendProperties frontendProperties;
    private final ApplicationEventPublisher eventPublisher;

    public TripEmailInvitationService(
            TripRepository tripRepository,
            TripMemberRepository tripMemberRepository,
            MemberRepository memberRepository,
            RedisValueService redisValueService,
            SmtpEmailClient emailClient,
            FrontendProperties frontendProperties,
            ApplicationEventPublisher eventPublisher
    ) {
        this.tripRepository = tripRepository;
        this.tripMemberRepository = tripMemberRepository;
        this.memberRepository = memberRepository;
        this.redisValueService = redisValueService;
        this.emailClient = emailClient;
        this.frontendProperties = frontendProperties;
        this.eventPublisher = eventPublisher;
    }

    public TripEmailInvitationAvailabilityResponse validate(Long inviterId, Long tripId, String rawEmail) {
        TripInvitationPolicy.requireOpen(findJoinedTrip(inviterId, tripId));
        Member invitee = memberRepository.findByEmail(normalizeEmail(rawEmail))
                .filter(member -> member.getStatus() == MemberStatus.ACTIVE)
                .orElse(null);
        if (invitee == null) {
            return new TripEmailInvitationAvailabilityResponse(
                    false, "Plamingo에 가입된 계정 이메일이 아닙니다.");
        }
        if (tripMemberRepository.existsByTripIdAndMemberId(tripId, invitee.getId())) {
            return new TripEmailInvitationAvailabilityResponse(
                    false, "이미 여행방에 참여한 회원입니다.");
        }
        return new TripEmailInvitationAvailabilityResponse(true, "초대할 수 있는 회원입니다.");
    }

    public void sendAll(Long inviterId, Long tripId, List<String> rawEmails) {
        Trip trip = TripInvitationPolicy.requireOpen(findJoinedTrip(inviterId, tripId));
        Member inviter = findActiveMember(inviterId);
        List<Member> invitees = new LinkedHashSet<>(rawEmails.stream()
                .map(this::normalizeEmail)
                .toList()).stream()
                .map(email -> findAvailableInvitee(tripId, email))
                .toList();
        invitees.forEach(invitee -> send(trip, inviter, invitee));
    }

    private Member findAvailableInvitee(Long tripId, String rawEmail) {
        Member invitee = memberRepository.findByEmail(normalizeEmail(rawEmail))
                .filter(member -> member.getStatus() == MemberStatus.ACTIVE)
                .orElseThrow(() -> new BusinessException(TripErrorCode.INVITEE_NOT_FOUND));
        if (tripMemberRepository.existsByTripIdAndMemberId(tripId, invitee.getId())) {
            throw new BusinessException(TripErrorCode.INVITEE_ALREADY_MEMBER);
        }
        return invitee;
    }

    private void send(Trip trip, Member inviter, Member invitee) {
        String token = generateToken();
        String key = tokenKey(token);
        redisValueService.set(key, invitee.getId() + ":" + trip.getId(), EXPIRATION);
        String invitationUrl = UriComponentsBuilder.fromUriString(frontendProperties.getFrontendBaseUrl())
                .path("/trip-invite/").pathSegment(token).build().toUriString();
        try {
            emailClient.sendTripInvitationEmail(
                    invitee.getEmail(), invitee.getNickname(), inviter.getNickname(), trip.getTitle(),
                    invitationUrl, EXPIRATION.toDays());
        } catch (RuntimeException exception) {
            redisValueService.delete(key);
            throw exception;
        }
    }

    private String normalizeEmail(String rawEmail) {
        return rawEmail.strip().toLowerCase();
    }

    @Transactional
    public Long accept(Long authenticatedMemberId, String token) {
        String key = tokenKey(token);
        String storedInvitation = redisValueService.get(key)
                .orElseThrow(() -> new BusinessException(TripErrorCode.EMAIL_INVITATION_INVALID));
        String[] invitation = parseInvitation(storedInvitation);
        Long memberId = parseId(invitation[0]);
        Long tripId = parseId(invitation[1]);
        if (!memberId.equals(authenticatedMemberId)) {
            throw new BusinessException(TripErrorCode.EMAIL_INVITATION_ACCOUNT_MISMATCH);
        }
        findActiveMember(memberId);
        TripInvitationPolicy.requireOpen(findActiveTrip(tripId));
        String consumedInvitation = redisValueService.getAndDelete(key)
                .orElseThrow(() -> new BusinessException(TripErrorCode.EMAIL_INVITATION_INVALID));
        if (!storedInvitation.equals(consumedInvitation)) {
            throw new BusinessException(TripErrorCode.EMAIL_INVITATION_INVALID);
        }
        if (!tripMemberRepository.existsByTripIdAndMemberId(tripId, memberId)) {
            tripMemberRepository.save(TripMember.member(tripId, memberId));
            eventPublisher.publishEvent(RealtimeEvent.tripMembers(tripId, memberId));
        }
        return tripId;
    }

    private String[] parseInvitation(String value) {
        String[] parts = value.split(":");
        if (parts.length != 2) {
            throw new BusinessException(TripErrorCode.EMAIL_INVITATION_INVALID);
        }
        return parts;
    }

    private Trip findJoinedTrip(Long memberId, Long tripId) {
        return tripRepository.findByIdAndMemberIdAndStatusNot(tripId, memberId, TripStatus.CANCELLED)
                .orElseThrow(() -> new BusinessException(TripErrorCode.TRIP_NOT_FOUND));
    }

    private Trip findActiveTrip(Long tripId) {
        return tripRepository.findByIdAndStatusNot(tripId, TripStatus.CANCELLED)
                .orElseThrow(() -> new BusinessException(TripErrorCode.TRIP_NOT_FOUND));
    }

    private Member findActiveMember(Long memberId) {
        return memberRepository.findById(memberId)
                .filter(member -> member.getStatus() == MemberStatus.ACTIVE)
                .orElseThrow(() -> new BusinessException(TripErrorCode.INVITEE_NOT_FOUND));
    }

    private Long parseId(String value) {
        try {
            return Long.valueOf(value);
        } catch (NumberFormatException exception) {
            throw new BusinessException(TripErrorCode.EMAIL_INVITATION_INVALID);
        }
    }

    private String tokenKey(String token) {
        if (token == null || token.isBlank()) {
            throw new BusinessException(TripErrorCode.EMAIL_INVITATION_INVALID);
        }
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(token.getBytes(StandardCharsets.UTF_8));
            return KEY_PREFIX + Base64.getUrlEncoder().withoutPadding().encodeToString(digest);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 algorithm is unavailable", exception);
        }
    }

    private String generateToken() {
        byte[] bytes = new byte[32];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
