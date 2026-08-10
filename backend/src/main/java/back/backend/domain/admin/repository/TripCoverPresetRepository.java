package back.backend.domain.admin.repository;

import back.backend.domain.admin.entity.TripCoverPreset;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TripCoverPresetRepository extends JpaRepository<TripCoverPreset, Long> {
    List<TripCoverPreset> findAllByActiveTrueOrderBySortOrderAscIdAsc();
    List<TripCoverPreset> findAllByOrderBySortOrderAscIdAsc();
    Optional<TripCoverPreset> findByPresetKeyAndActiveTrue(String presetKey);
}
