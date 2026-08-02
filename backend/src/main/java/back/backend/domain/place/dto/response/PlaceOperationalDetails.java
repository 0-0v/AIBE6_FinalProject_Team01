package back.backend.domain.place.dto.response;

import java.time.OffsetDateTime;
import java.time.LocalDateTime;
import java.util.List;

public record PlaceOperationalDetails(
        String businessStatus,
        Boolean openNow,
        OffsetDateTime nextOpenTime,
        OffsetDateTime nextCloseTime,
        List<String> weekdayDescriptions,
        List<OpeningWindow> openingWindows
) {
    public record OpeningWindow(
            LocalDateTime opensAt,
            LocalDateTime closesAt
    ) {
    }
}
