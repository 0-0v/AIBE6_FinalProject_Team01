package back.backend.domain.place.repository;

import back.backend.domain.place.entity.PlaceRelation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface PlaceRelationRepository extends JpaRepository<PlaceRelation, Long> {

    @Query(value = """
            SELECT tp1.place_id AS fromPlaceId,
                   tp2.place_id AS toPlaceId,
                   COUNT(*) AS pairCount
            FROM itinerary_items ii1
            JOIN itinerary_items ii2
                ON ii1.itinerary_day_id = ii2.itinerary_day_id
                AND ii1.trip_place_id <> ii2.trip_place_id
            JOIN trip_places tp1 ON tp1.id = ii1.trip_place_id
            JOIN trip_places tp2 ON tp2.id = ii2.trip_place_id
            WHERE tp1.place_id < tp2.place_id
            GROUP BY tp1.place_id, tp2.place_id
            """, nativeQuery = true)
    List<PlaceCoVisitProjection> aggregateCoVisitCounts();

    @Query("""
            SELECT r FROM PlaceRelation r
            WHERE r.fromPlaceId IN :placeIds AND r.toPlaceId IN :placeIds
            """)
    List<PlaceRelation> findAllByPlaceIdsIn(@Param("placeIds") Collection<Long> placeIds);

    interface PlaceCoVisitProjection {
        Long getFromPlaceId();
        Long getToPlaceId();
        Long getPairCount();
    }
}
