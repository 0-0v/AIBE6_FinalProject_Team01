package back.backend.domain.trip.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.util.List;

public record TripEmailInvitationsRequest(
        @NotEmpty
        @Size(max = 20)
        List<@Email String> emails
) {
}
