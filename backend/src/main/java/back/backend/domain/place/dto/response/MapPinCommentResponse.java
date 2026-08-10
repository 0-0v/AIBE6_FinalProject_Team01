package back.backend.domain.place.dto.response;

public record MapPinCommentResponse(
        Long id,
        Long mapPinId,
        Long memberId,
        String content,
        String createdAt
) {}
