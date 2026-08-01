package back.backend.domain.agent.dto.request;

import java.time.LocalDateTime;

public record AiItineraryReplanRequest(
        LocalDateTime testCutoffAt
) {
}
