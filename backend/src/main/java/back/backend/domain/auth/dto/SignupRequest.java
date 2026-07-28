package back.backend.domain.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record SignupRequest(
        @NotBlank(message = "이메일은 필수입니다.")
        @Email(message = "올바른 이메일 형식이어야 합니다.")
        String email,
        @NotBlank(message = "비밀번호는 필수입니다.")
        @Pattern(
                regexp = "(?s)^(?!.*(.)\\1\\1).{8,64}$",
                message = "비밀번호는 8~64자이며 동일한 문자를 3번 이상 연속 사용할 수 없습니다."
        )
        String password,
        @NotBlank(message = "닉네임은 필수입니다.")
        @Size(min = 2, max = 12, message = "닉네임은 2~12자여야 합니다.")
        @Pattern(regexp = "^[가-힣a-zA-Z0-9_]+$", message = "닉네임은 한글, 영문, 숫자, _만 사용할 수 있습니다.")
        String nickname
) {
    @Override
    public String toString() {
        return "SignupRequest[email=" + email + ", password=***, nickname=" + nickname + "]";
    }
}
