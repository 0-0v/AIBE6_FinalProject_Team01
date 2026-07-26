package back.backend.domain.trip.dto;

import java.time.LocalDateTime;

public record GuestAccessGrant(TripResponse trip, String token, LocalDateTime expiresAt) {
}
