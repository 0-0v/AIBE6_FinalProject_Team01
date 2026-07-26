package back.backend.domain.travelrecord.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import java.util.List;

public record TravelRecordCreateRequest(
        @NotNull Long tripPlaceId,
        Long itineraryItemId,
        @NotNull LocalDateTime visitedAt,
        @Size(max = 5000) String memo,
        @Size(max = 10) List<@Size(max = 500) String> imageUrls
) {
}
