package back.backend.domain.trip.repository;

import back.backend.domain.trip.entity.TripGuestMember;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TripGuestMemberRepository extends JpaRepository<TripGuestMember, Long> {
    boolean existsByTripIdAndGuestSessionId(Long tripId, Long guestSessionId);
    List<TripGuestMember> findAllByGuestSessionId(Long guestSessionId);
    List<TripGuestMember> findAllByTripIdOrderByJoinedAtAsc(Long tripId);
    void deleteAllByGuestSessionId(Long guestSessionId);
}
