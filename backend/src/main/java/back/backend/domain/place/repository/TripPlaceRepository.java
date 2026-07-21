package back.backend.domain.place.repository;

import back.backend.domain.place.entity.TripPlace;
import back.backend.domain.place.entity.TripPlaceStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TripPlaceRepository extends JpaRepository<TripPlace, Long> {
    List<TripPlace> findByTripId(Long tripId);
    List<TripPlace> findByTripIdAndStatus(Long tripId, TripPlaceStatus status);
    boolean existsByTripIdAndPlaceId(Long tripId, Long placeId);
    Optional<TripPlace> findByIdAndTripId(Long id, Long tripId);
}
