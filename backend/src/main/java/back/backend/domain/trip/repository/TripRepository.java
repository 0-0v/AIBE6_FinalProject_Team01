package back.backend.domain.trip.repository;

import back.backend.domain.trip.entity.Trip;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface TripRepository extends JpaRepository<Trip, Long> {

    @EntityGraph(attributePaths = "travelStyles")
    List<Trip> findAllByOwnerIdAndStatusNotOrderByCreatedAtDesc(Long ownerId, back.backend.domain.trip.entity.TripStatus status);

    @EntityGraph(attributePaths = "travelStyles")
    @Query("""
            select distinct t
            from Trip t
            left join TripMember tm on tm.tripId = t.id
            where (t.ownerId = :memberId or tm.memberId = :memberId)
              and t.status <> :status
            order by t.createdAt desc
            """)
    List<Trip> findAllAccessibleByMemberIdAndStatusNot(
            Long memberId,
            back.backend.domain.trip.entity.TripStatus status
    );

    @EntityGraph(attributePaths = "travelStyles")
    Optional<Trip> findByIdAndOwnerIdAndStatusNot(Long id, Long ownerId, back.backend.domain.trip.entity.TripStatus status);

    @EntityGraph(attributePaths = "travelStyles")
    Optional<Trip> findByIdAndStatusNot(Long id, back.backend.domain.trip.entity.TripStatus status);
}
