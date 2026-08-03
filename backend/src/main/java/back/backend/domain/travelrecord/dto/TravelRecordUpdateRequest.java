package back.backend.domain.travelrecord.dto;

import jakarta.validation.constraints.Size;
import java.util.List;

public record TravelRecordUpdateRequest(
        @Size(max = 5000) String memo,
        @Size(max = 10) List<@Size(max = 500) String> imageUrls
) {
}
