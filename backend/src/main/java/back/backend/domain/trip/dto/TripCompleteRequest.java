package back.backend.domain.trip.dto;

import back.backend.domain.trip.entity.TripVisibility;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public record TripCompleteRequest(
        @NotNull(message = "카드 공개 여부는 필수입니다.") TripVisibility visibility,
        @Size(max = 10, message = "카드 태그는 최대 10개까지 설정할 수 있습니다.") List<@Size(max = 50) String> tags
) {}
