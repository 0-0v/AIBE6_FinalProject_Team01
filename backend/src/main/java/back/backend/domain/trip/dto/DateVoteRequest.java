package back.backend.domain.trip.dto;

import jakarta.validation.constraints.NotNull;

public record DateVoteRequest(@NotNull Choice choice) {
    public enum Choice { AGREE, DISAGREE }
}
