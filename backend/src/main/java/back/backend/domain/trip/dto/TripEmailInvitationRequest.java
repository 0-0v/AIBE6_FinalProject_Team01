package back.backend.domain.trip.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record TripEmailInvitationRequest(@NotBlank @Email String email) {
}
