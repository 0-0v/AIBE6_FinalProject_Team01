package back.backend.domain.trip.dto;

import back.backend.domain.trip.entity.TripVisibility;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public record TripCompletionConfirmationRequest(
        @NotNull(message = "여행방 공개 여부는 필수입니다.")
        TripVisibility visibility,
        @Size(max = 10, message = "여행방 태그는 최대 10개까지 입력할 수 있습니다.")
        List<@Size(max = 50, message = "여행방 태그는 50자 이하여야 합니다.") String> tags,
        @Size(max = 500, message = "여행방 설명은 500자 이하여야 합니다.")
        String description
) {
    public TripCompletionConfirmationRequest(TripVisibility visibility, List<String> tags) {
        this(visibility, tags, null);
    }
}
