package back.backend.domain.travelrecord.repository;

import back.backend.domain.travelrecord.entity.TravelPhoto;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TravelPhotoRepository extends JpaRepository<TravelPhoto, Long> {
    List<TravelPhoto> findAllByTravelRecordIdInOrderBySortOrderAsc(Collection<Long> recordIds);
}
