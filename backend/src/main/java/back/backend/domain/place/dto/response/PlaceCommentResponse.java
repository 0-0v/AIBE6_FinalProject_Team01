package back.backend.domain.place.dto.response;

public record PlaceCommentResponse(
        Long id,
        Long tripPlaceId,
        Long memberId,
        String content,
        String createdAt
) {}
