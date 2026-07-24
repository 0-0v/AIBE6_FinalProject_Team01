package back.backend.domain.place.repository;

import back.backend.domain.place.entity.PlaceVoteResponse;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PlaceVoteResponseRepository extends JpaRepository<PlaceVoteResponse, Long> {

    Optional<PlaceVoteResponse> findByVoteRequestIdAndMemberId(Long voteRequestId, Long memberId);

    List<PlaceVoteResponse> findAllByVoteRequestId(Long voteRequestId);

    List<PlaceVoteResponse> findAllByVoteRequestIdIn(Collection<Long> voteRequestIds);
}
