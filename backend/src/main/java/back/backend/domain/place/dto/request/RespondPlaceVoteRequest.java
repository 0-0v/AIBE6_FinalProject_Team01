package back.backend.domain.place.dto.request;

import back.backend.domain.place.entity.PlaceVoteChoice;
import jakarta.validation.constraints.NotNull;

public record RespondPlaceVoteRequest(@NotNull PlaceVoteChoice choice) {}
