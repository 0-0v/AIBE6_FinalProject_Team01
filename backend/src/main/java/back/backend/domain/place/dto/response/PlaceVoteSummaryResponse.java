package back.backend.domain.place.dto.response;

import back.backend.domain.place.entity.PlaceVoteChoice;
import back.backend.domain.place.entity.PlaceVoteStatus;
import back.backend.domain.place.entity.TripPlaceStatus;
public record PlaceVoteSummaryResponse(
        Long tripPlaceId,
        Long secondaryTripPlaceId,
        Long voteRequestId,
        back.backend.domain.place.entity.PlaceVoteType type,
        String creatorComment,
        PlaceOptionResponse primaryPlace,
        PlaceOptionResponse secondaryPlace,
        String comparisonSummary,
        PlaceVoteStatus status,
        int agreeCount,
        int disagreeCount,
        int responseCount,
        int requiredResponseCount,
        int totalMemberCount,
        PlaceVoteChoice myChoice,
        back.backend.domain.place.entity.PlaceVoteResult result,
        Long winnerTripPlaceId,
        String expiresAt
) {
    public record PlaceOptionResponse(
            Long tripPlaceId,
            String name,
            String address,
            String aiDescription
    ) {}
}
