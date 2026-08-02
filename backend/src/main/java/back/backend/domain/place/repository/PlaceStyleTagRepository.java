package back.backend.domain.place.repository;

import back.backend.domain.place.entity.PlaceStyleTag;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface PlaceStyleTagRepository extends JpaRepository<PlaceStyleTag, Long> {

    List<PlaceStyleTag> findAllByPlaceId(Long placeId);

    List<PlaceStyleTag> findAllByPlaceIdIn(Collection<Long> placeIds);
}
