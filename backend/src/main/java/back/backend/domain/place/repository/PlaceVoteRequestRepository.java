package back.backend.domain.place.repository;

import back.backend.domain.place.entity.PlaceVoteRequest;
import jakarta.persistence.LockModeType;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PlaceVoteRequestRepository extends JpaRepository<PlaceVoteRequest, Long> {

    @Query("""
            SELECT COUNT(request) > 0 FROM PlaceVoteRequest request
            WHERE request.status = back.backend.domain.place.entity.PlaceVoteStatus.OPEN
              AND request.expiresAt > :now
              AND (request.tripPlaceId IN :tripPlaceIds OR request.secondaryTripPlaceId IN :tripPlaceIds)
            """)
    boolean existsOpenVoteForAnyPlace(
            @Param("tripPlaceIds") Collection<Long> tripPlaceIds,
            @Param("now") java.time.LocalDateTime now
    );

    Optional<PlaceVoteRequest> findFirstByTripPlaceIdOrderByIdDesc(Long tripPlaceId);

    @Query("""
            SELECT request FROM PlaceVoteRequest request
            WHERE request.tripPlaceId IN :tripPlaceIds
               OR request.secondaryTripPlaceId IN :tripPlaceIds
            ORDER BY request.id DESC
            """)
    List<PlaceVoteRequest> findAllByTripPlaceIds(@Param("tripPlaceIds") Collection<Long> tripPlaceIds);

    @Query("""
            SELECT request FROM PlaceVoteRequest request
            WHERE request.tripPlaceId IN :tripPlaceIds
              AND request.id = (
                  SELECT MAX(latest.id) FROM PlaceVoteRequest latest
                  WHERE latest.tripPlaceId = request.tripPlaceId
              )
            ORDER BY request.id DESC
            """)
    List<PlaceVoteRequest> findLatestByTripPlaceIdIn(
            @Param("tripPlaceIds") Collection<Long> tripPlaceIds
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT request FROM PlaceVoteRequest request WHERE request.id = :id")
    Optional<PlaceVoteRequest> findByIdForUpdate(@Param("id") Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            SELECT request FROM PlaceVoteRequest request
            WHERE request.tripPlaceId = :tripPlaceId
               OR request.secondaryTripPlaceId = :tripPlaceId
               OR request.winnerTripPlaceId = :tripPlaceId
            """)
    List<PlaceVoteRequest> findAllByTripPlaceIdForUpdate(
            @Param("tripPlaceId") Long tripPlaceId
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            SELECT request FROM PlaceVoteRequest request
            WHERE request.status = back.backend.domain.place.entity.PlaceVoteStatus.OPEN
              AND (
                  request.tripPlaceId IN (
                      SELECT tripPlace.id FROM TripPlace tripPlace
                      WHERE tripPlace.tripId = :tripId
                  )
                  OR request.secondaryTripPlaceId IN (
                      SELECT tripPlace.id FROM TripPlace tripPlace
                      WHERE tripPlace.tripId = :tripId
                  )
              )
            """)
    List<PlaceVoteRequest> findAllOpenByTripIdForUpdate(@Param("tripId") Long tripId);
}
