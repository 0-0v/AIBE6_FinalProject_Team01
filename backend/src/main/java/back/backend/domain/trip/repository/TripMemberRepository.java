package back.backend.domain.trip.repository;

import back.backend.domain.trip.entity.TripMember;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import org.springframework.data.jpa.repository.Query;

public interface TripMemberRepository extends JpaRepository<TripMember, Long> {
    void deleteAllByTripId(Long tripId);

    long countByTripId(Long tripId);

    @Query("select tm.memberId from TripMember tm where tm.tripId = :tripId")
    List<Long> findMemberIdsByTripId(Long tripId);
}
