package back.backend.domain.card.dto;
import java.util.List;
public record PublicCardPageResponse(
        List<PublicCardResponse> content, int page, int size, long totalElements, int totalPages
) {}
