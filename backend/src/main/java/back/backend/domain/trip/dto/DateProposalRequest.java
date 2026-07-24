package back.backend.domain.trip.dto;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

public record DateProposalRequest(
        @NotNull LocalDate startDate,
        @NotNull LocalDate endDate
) {
}
