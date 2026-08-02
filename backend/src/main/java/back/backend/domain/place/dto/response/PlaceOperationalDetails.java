package back.backend.domain.place.dto.response;

import java.time.OffsetDateTime;
import java.util.List;

public record PlaceOperationalDetails(
        String businessStatus,
        Boolean openNow,
        OffsetDateTime nextOpenTime,
        OffsetDateTime nextCloseTime,
        List<String> weekdayDescriptions
) {
}
