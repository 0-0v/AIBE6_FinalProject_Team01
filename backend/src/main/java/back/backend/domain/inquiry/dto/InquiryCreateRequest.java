package back.backend.domain.inquiry.dto;

import back.backend.domain.inquiry.entity.InquiryCategory;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record InquiryCreateRequest(
        @NotNull InquiryCategory category,
        @NotBlank @Email @Size(max = 255) String email,
        @NotBlank @Size(max = 100) String subject,
        @NotBlank @Size(max = 3000) String content
) {}
