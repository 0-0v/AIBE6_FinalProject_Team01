package back.backend.domain.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
        @NotBlank(message = "닉네임 또는 이메일은 필수입니다.")
        String identifier,
        @NotBlank(message = "비밀번호는 필수입니다.")
        String password
) {
    @Override
    public String toString() {
        return "LoginRequest[identifier=" + identifier + ", password=***]";
    }
}
