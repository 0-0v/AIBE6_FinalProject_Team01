package back.backend.domain.card.dto;
import java.time.LocalDateTime;
import java.util.List;
public record PublicCardResponse(
        Long id, Long tripId, Long authorId, String authorNickname, String title,
        String summary, String destination, String coverImageUrl, List<String> tags,
        long bookmarkCount, long commentCount, boolean bookmarked, boolean ownCard,
        LocalDateTime createdAt
) {}
