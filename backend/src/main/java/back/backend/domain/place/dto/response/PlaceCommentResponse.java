package back.backend.domain.place.dto.response;

import java.time.LocalDateTime;

public record PlaceCommentResponse(
        Long id,
        Long tripPlaceId,
        Long memberId,
        String content,
        LocalDateTime createdAt
) {}
