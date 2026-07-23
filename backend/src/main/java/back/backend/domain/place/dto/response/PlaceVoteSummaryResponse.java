package back.backend.domain.place.dto.response;

import back.backend.domain.place.entity.PlaceVoteChoice;
import back.backend.domain.place.entity.PlaceVoteStatus;
import back.backend.domain.place.entity.TripPlaceStatus;
import java.time.LocalDateTime;

public record PlaceVoteSummaryResponse(
        Long tripPlaceId,
        Long voteRequestId,
        PlaceVoteStatus status,
        int agreeCount,
        int disagreeCount,
        int responseCount,
        int requiredResponseCount,
        int totalMemberCount,
        PlaceVoteChoice myChoice,
        TripPlaceStatus placeStatus,
        LocalDateTime expiresAt
) {}
