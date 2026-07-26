package back.backend.domain.trip.repository;

import back.backend.domain.trip.entity.GuestSession;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GuestSessionRepository extends JpaRepository<GuestSession, Long> {
    Optional<GuestSession> findByTokenHash(String tokenHash);
}
