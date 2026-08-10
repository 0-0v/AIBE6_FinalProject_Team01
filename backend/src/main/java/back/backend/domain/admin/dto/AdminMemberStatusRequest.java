package back.backend.domain.admin.dto;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;

public record AdminMemberStatusRequest(
        @NotBlank @Size(max = 500) String reason,
        @Future LocalDateTime suspendedUntil
) {}
