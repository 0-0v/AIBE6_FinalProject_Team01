package back.backend.domain.card.dto;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
public record CardCommentRequest(@NotBlank @Size(max = 1000) String content) {}
