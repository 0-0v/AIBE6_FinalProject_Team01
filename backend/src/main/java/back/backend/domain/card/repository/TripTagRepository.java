package back.backend.domain.card.repository;
import back.backend.domain.card.entity.TripTag;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
public interface TripTagRepository extends JpaRepository<TripTag, Long> {
    Optional<TripTag> findByTripIdAndName(Long tripId, String name);
    List<TripTag> findAllByTripIdOrderBySortOrderAsc(Long tripId);
    void deleteAllByTripId(Long tripId);
}
