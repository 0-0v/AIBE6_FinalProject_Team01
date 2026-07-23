package back.backend.domain.trip.dto;
import java.time.LocalDateTime;
public record TripInvitationResponse(String inviteCode, LocalDateTime expiresAt) {}
