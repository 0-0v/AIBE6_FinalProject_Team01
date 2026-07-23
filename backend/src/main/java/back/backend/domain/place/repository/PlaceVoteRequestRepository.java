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

    Optional<PlaceVoteRequest> findFirstByTripPlaceIdOrderByIdDesc(Long tripPlaceId);

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
}
