package back.backend.domain.trip.repository;

import back.backend.domain.trip.entity.TripMember;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TripMemberRepository extends JpaRepository<TripMember, Long> {
    void deleteAllByTripId(Long tripId);
}
