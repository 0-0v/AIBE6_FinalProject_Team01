package back.backend.domain.itinerary.dto.request;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;

public record UpdateItineraryItemRequest(
    @Pattern(regexp = "(?:[01]\\d|2[0-3]):[0-5]\\d") String startTime,
    @Pattern(regexp = "(?:[01]\\d|2[0-3]):[0-5]\\d") String endTime,
    String memo,
    @PositiveOrZero Integer transportMinutes,
    @PositiveOrZero Integer transportMeters
) {}
