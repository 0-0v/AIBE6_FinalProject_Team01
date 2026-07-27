package back.backend.domain.card.dto;
import java.time.LocalDateTime;
public record CardCommentResponse(
        Long id, Long memberId, String memberNickname, String content, boolean mine, LocalDateTime createdAt
) {}
