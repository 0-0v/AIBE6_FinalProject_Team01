package back.backend.domain.collaboration.activitylog.port;

public interface TripMemberAccessChecker {

    boolean isMember(Long tripId, Long memberId);
}
