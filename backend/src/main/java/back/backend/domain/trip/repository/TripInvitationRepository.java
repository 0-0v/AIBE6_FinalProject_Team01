package back.backend.domain.trip.repository;
import back.backend.domain.trip.entity.TripInvitation;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
public interface TripInvitationRepository extends JpaRepository<TripInvitation, Long> {
    Optional<TripInvitation> findByInviteCode(String inviteCode);
    boolean existsByAccessCode(String accessCode);
}
