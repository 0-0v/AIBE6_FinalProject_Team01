package back.backend.domain.agent.dto.request;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.AssertTrue;

import java.util.List;

public record AiItineraryReplanRequest(
        AiReplanScope scope,
        Long dayId,
        Long itineraryItemId,
        @NotEmpty List<@NotNull AiReplanReason> reasons
) {
    public AiReplanScope effectiveScope() {
        return scope == null ? AiReplanScope.REMAINING_DAYS : scope;
    }

    @AssertTrue(message = "재배치 범위에 맞는 Day 또는 시작 일정이 필요합니다.")
    public boolean isTargetValid() {
        return effectiveScope() == AiReplanScope.SINGLE_DAY
                ? dayId != null
                : itineraryItemId != null;
    }
}
