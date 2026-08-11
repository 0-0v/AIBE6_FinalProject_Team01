package back.backend.global.realtime;

import back.backend.domain.trip.repository.TripMemberRepository;
import back.backend.global.exception.BusinessException;
import back.backend.global.exception.CommonErrorCode;
import java.security.Principal;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
public class TripAwarenessService {

    private final TripMemberRepository tripMemberRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public TripAwarenessService(
            TripMemberRepository tripMemberRepository,
            SimpMessagingTemplate messagingTemplate
    ) {
        this.tripMemberRepository = tripMemberRepository;
        this.messagingTemplate = messagingTemplate;
    }

    public void publish(Long tripId, TripAwarenessRequest request, Principal principal) {
        Long memberId = resolveMemberId(principal);
        if (!tripMemberRepository.existsByTripIdAndMemberId(tripId, memberId)) {
            throw new BusinessException(CommonErrorCode.FORBIDDEN);
        }
        if ((request.mapLat() == null) != (request.mapLng() == null)) {
            throw new BusinessException(CommonErrorCode.BAD_REQUEST);
        }

        TripAwarenessEvent event = TripAwarenessEvent.from(tripId, memberId, request);
        messagingTemplate.convertAndSend("/topic/trip-awareness/" + tripId, event);
    }

    private Long resolveMemberId(Principal principal) {
        if (principal == null) {
            throw new BusinessException(CommonErrorCode.UNAUTHORIZED);
        }
        try {
            return Long.valueOf(principal.getName());
        } catch (NumberFormatException exception) {
            throw new BusinessException(CommonErrorCode.UNAUTHORIZED);
        }
    }
}
