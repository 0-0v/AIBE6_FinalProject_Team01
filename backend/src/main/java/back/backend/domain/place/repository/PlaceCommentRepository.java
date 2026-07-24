package back.backend.domain.place.repository;

import back.backend.domain.place.entity.PlaceComment;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PlaceCommentRepository extends JpaRepository<PlaceComment, Long> {

    List<PlaceComment> findAllByTripPlaceIdOrderByIdAsc(Long tripPlaceId);

    Optional<PlaceComment> findByIdAndMemberId(Long id, Long memberId);

    @Query("SELECT pc.tripPlaceId AS tripPlaceId, COUNT(pc) AS commentCount " +
           "FROM PlaceComment pc WHERE pc.tripPlaceId IN :tripPlaceIds " +
           "GROUP BY pc.tripPlaceId")
    List<CommentCountProjection> countByTripPlaceIds(@Param("tripPlaceIds") List<Long> tripPlaceIds);

    interface CommentCountProjection {
        Long getTripPlaceId();
        Long getCommentCount();
    }
}
