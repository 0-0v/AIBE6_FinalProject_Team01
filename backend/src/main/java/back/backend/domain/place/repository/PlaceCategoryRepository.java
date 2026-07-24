package back.backend.domain.place.repository;

import back.backend.domain.place.entity.PlaceCategory;
import back.backend.domain.place.entity.PlaceCategoryType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PlaceCategoryRepository extends JpaRepository<PlaceCategory, Long> {

    List<PlaceCategory> findAllByTripIdOrderBySortOrderAscIdAsc(Long tripId);

    Optional<PlaceCategory> findByIdAndTripId(Long id, Long tripId);

    Optional<PlaceCategory> findFirstByTripIdAndCategoryType(
            Long tripId,
            PlaceCategoryType categoryType
    );

    long countByTripId(Long tripId);
}
