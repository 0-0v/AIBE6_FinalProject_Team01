package back.backend.domain.travelrecord.repository;

import back.backend.domain.travelrecord.entity.TripRetrospective;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TripRetrospectiveRepository extends JpaRepository<TripRetrospective, Long> {
    Optional<TripRetrospective> findByTripIdAndMemberId(Long tripId, Long memberId);
}
