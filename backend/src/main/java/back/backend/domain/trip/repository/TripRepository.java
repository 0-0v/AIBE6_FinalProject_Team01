package back.backend.domain.trip.repository;

import back.backend.domain.trip.entity.Trip;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TripRepository extends JpaRepository<Trip, Long> {

    @EntityGraph(attributePaths = "travelStyles")
    List<Trip> findAllByOwnerIdOrderByCreatedAtDesc(Long ownerId);

    @EntityGraph(attributePaths = "travelStyles")
    Optional<Trip> findByIdAndOwnerId(Long id, Long ownerId);
}
