package back.backend.domain.place.dto.request;

import back.backend.domain.place.entity.PlaceVoteType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreatePlaceVoteRequest(
        @NotNull PlaceVoteType type,
        @NotNull Long primaryTripPlaceId,
        Long secondaryTripPlaceId,
        @Size(max = 500) String creatorComment
) {}
