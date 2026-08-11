package back.backend.global.realtime;

import back.backend.domain.trip.repository.TripMemberRepository;
import java.security.Principal;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;

@Component
public class TripSubscriptionAuthorizer {

    private static final Pattern TRIP_TOPIC_PATTERN =
            Pattern.compile("^/topic/(?:trips|trip-awareness)/(\\d+)$");

    private final TripMemberRepository tripMemberRepository;

    public TripSubscriptionAuthorizer(TripMemberRepository tripMemberRepository) {
        this.tripMemberRepository = tripMemberRepository;
    }

    public void authorize(String destination, Principal principal) {
        if (destination == null) {
            return;
        }
        boolean tripScopedTopic = destination.startsWith("/topic/trips/")
                || destination.startsWith("/topic/trip-awareness/");
        if (!tripScopedTopic) {
            return;
        }
        Matcher matcher = TRIP_TOPIC_PATTERN.matcher(destination);
        if (!matcher.matches()) {
            throw new IllegalArgumentException("잘못된 여행방 실시간 채널입니다.");
        }
        if (principal == null) {
            throw new IllegalArgumentException("여행방 실시간 채널 인증이 필요합니다.");
        }
        try {
            Long tripId = Long.valueOf(matcher.group(1));
            Long memberId = Long.valueOf(principal.getName());
            if (!tripMemberRepository.existsByTripIdAndMemberId(tripId, memberId)) {
                throw new IllegalArgumentException("여행방 실시간 채널에 접근할 권한이 없습니다.");
            }
        } catch (NumberFormatException exception) {
            throw new IllegalArgumentException("잘못된 여행방 실시간 채널입니다.", exception);
        }
    }
}
