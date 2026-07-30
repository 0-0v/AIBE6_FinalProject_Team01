package back.backend.domain.trip.dto;

import jakarta.validation.constraints.NotBlank;

public record ClaimTripInvitationRequest(
        @NotBlank(message = "초대 코드는 필수입니다.")
        String inviteCode
) {
}
