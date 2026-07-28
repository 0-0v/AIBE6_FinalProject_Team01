package back.backend.domain.trip.repository;

import back.backend.domain.trip.entity.Trip;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.time.LocalDate;
import java.util.Collection;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TripRepository extends JpaRepository<Trip, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select t from Trip t where t.id = :tripId")
    Optional<Trip> findByIdForItineraryInitialization(
            @Param("tripId") Long tripId
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select t from Trip t where t.id = :tripId and t.status <> :status")
    Optional<Trip> findByIdAndStatusNotForMembershipChange(
            @Param("tripId") Long tripId,
            @Param("status") back.backend.domain.trip.entity.TripStatus status
    );

    @EntityGraph(attributePaths = "travelStyles")
    List<Trip> findAllByStatusInAndEndDateBefore(
            Collection<back.backend.domain.trip.entity.TripStatus> statuses,
            LocalDate endDate
    );

    @EntityGraph(attributePaths = "travelStyles")
    List<Trip> findAllByOwnerIdAndStatusNotOrderByCreatedAtDesc(Long ownerId, back.backend.domain.trip.entity.TripStatus status);

    @EntityGraph(attributePaths = "travelStyles")
    @Query("""
            select distinct t
            from Trip t
            join TripMember tm on tm.tripId = t.id
            where tm.memberId = :memberId
              and t.status <> :status
            order by t.createdAt desc
            """)
    List<Trip> findAllAccessibleByMemberIdAndStatusNot(
            Long memberId,
            back.backend.domain.trip.entity.TripStatus status
    );

    @EntityGraph(attributePaths = "travelStyles")
    @Query("""
            select distinct t
            from Trip t
            join TripMember tm on tm.tripId = t.id
            where tm.memberId = :memberId
              and t.status in :statuses
              and t.startDate is not null
              and t.endDate is not null
              and t.endDate >= :today
            order by t.startDate asc
            """)
    List<Trip> findCopyTargets(
            Long memberId,
            Collection<back.backend.domain.trip.entity.TripStatus> statuses,
            LocalDate today
    );

    @Query("""
            select t
            from Trip t
            join TripMember tm on tm.tripId = t.id
            where t.id = :id
              and tm.memberId = :memberId
              and t.status <> :status
            """)
    @EntityGraph(attributePaths = "travelStyles")
    Optional<Trip> findByIdAndMemberIdAndStatusNot(
            Long id,
            Long memberId,
            back.backend.domain.trip.entity.TripStatus status
    );

    @EntityGraph(attributePaths = "travelStyles")
    Optional<Trip> findByIdAndStatusNot(Long id, back.backend.domain.trip.entity.TripStatus status);
}
