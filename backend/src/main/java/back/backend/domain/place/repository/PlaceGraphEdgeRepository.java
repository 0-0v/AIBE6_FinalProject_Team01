package back.backend.domain.place.repository;

import back.backend.domain.place.entity.PlaceGraphEdge;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface PlaceGraphEdgeRepository extends JpaRepository<PlaceGraphEdge, Long> {

    @Query("""
            SELECT edge
            FROM PlaceGraphEdge edge
            WHERE edge.fromPlace.id = :fromPlaceId
              AND edge.toPlace.id = :toPlaceId
              AND edge.transportType = :transportType
            """)
    Optional<PlaceGraphEdge> findByRoute(
            @Param("fromPlaceId") Long fromPlaceId,
            @Param("toPlaceId") Long toPlaceId,
            @Param("transportType") String transportType
    );
}
