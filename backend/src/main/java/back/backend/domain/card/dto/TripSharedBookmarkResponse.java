package back.backend.domain.card.dto;

import java.util.List;

public record TripSharedBookmarkResponse(
        PublicCardResponse card,
        List<String> sharerNicknames,
        boolean sharedByMe) {}
