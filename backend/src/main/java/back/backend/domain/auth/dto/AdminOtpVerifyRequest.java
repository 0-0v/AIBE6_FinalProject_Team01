package back.backend.domain.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record AdminOtpVerifyRequest(
        @NotBlank String challengeToken,
        @Pattern(regexp = "\\d{6}", message = "OTP는 6자리 숫자여야 합니다.") String code
) {}
