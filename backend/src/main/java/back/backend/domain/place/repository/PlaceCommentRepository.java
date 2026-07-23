package back.backend.domain.place.repository;

import back.backend.domain.place.entity.PlaceComment;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PlaceCommentRepository extends JpaRepository<PlaceComment, Long> {

    List<PlaceComment> findAllByTripPlaceIdOrderByIdAsc(Long tripPlaceId);

    Optional<PlaceComment> findByIdAndMemberId(Long id, Long memberId);
}
