package back.backend.domain.place.repository;

import back.backend.domain.place.entity.MapPin;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MapPinRepository extends JpaRepository<MapPin, Long> {

    Optional<MapPin> findByTripIdAndGooglePlaceId(Long tripId, String googlePlaceId);

    List<MapPin> findAllByTripId(Long tripId);
}
