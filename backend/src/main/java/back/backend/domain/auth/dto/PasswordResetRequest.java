package back.backend.domain.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record PasswordResetRequest(
        @NotBlank(message = "이메일은 필수입니다.")
        @Email(message = "올바른 이메일 형식이어야 합니다.")
        String email,
        @NotBlank(message = "새 비밀번호는 필수입니다.")
        @Pattern(
                regexp = "^(?=.*[A-Za-z])(?=.*\\d)(?=.*[!@#$%^&*()_+\\-=])[A-Za-z\\d!@#$%^&*()_+\\-=]{8,64}$",
                message = "비밀번호는 영문, 숫자, 특수문자를 포함한 8~64자여야 합니다."
        )
        String newPassword
) {
    @Override
    public String toString() {
        return "PasswordResetRequest[email=" + email + ", newPassword=***]";
    }
}
