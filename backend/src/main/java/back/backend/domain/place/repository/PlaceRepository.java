package back.backend.domain.place.repository;

import back.backend.domain.place.entity.Place;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PlaceRepository extends JpaRepository<Place, Long> {
    Optional<Place> findByGooglePlaceId(String googlePlaceId);
}
