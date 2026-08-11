package back.backend.domain.place.repository;

import back.backend.domain.place.entity.MapPinComment;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MapPinCommentRepository extends JpaRepository<MapPinComment, Long> {

    List<MapPinComment> findAllByMapPinIdOrderByIdAsc(Long mapPinId);

    Optional<MapPinComment> findByIdAndMapPinIdAndMemberId(Long id, Long mapPinId, Long memberId);

    @Query("SELECT c.mapPinId AS mapPinId, COUNT(c) AS commentCount " +
           "FROM MapPinComment c WHERE c.mapPinId IN :mapPinIds " +
           "GROUP BY c.mapPinId")
    List<CommentCountProjection> countByMapPinIds(@Param("mapPinIds") List<Long> mapPinIds);

    interface CommentCountProjection {
        Long getMapPinId();
        Long getCommentCount();
    }
}
