package back.backend.domain.trip.dto;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.Set;

public record DateAvailabilityRequest(@NotNull Set<@NotNull LocalDate> availableDates) {
}
