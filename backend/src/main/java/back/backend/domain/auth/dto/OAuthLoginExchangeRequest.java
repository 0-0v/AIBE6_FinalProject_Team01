package back.backend.domain.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record OAuthLoginExchangeRequest(@NotBlank String code) {
}
