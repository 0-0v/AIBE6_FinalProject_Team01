package back.backend.domain.admin.dto;

import back.backend.domain.admin.entity.ExternalApiProvider;
import back.backend.domain.admin.entity.ExternalApiUsage;
import java.time.LocalDateTime;

public record ExternalApiUsageResponse(
        Long id, ExternalApiProvider provider, String operation, boolean success,
        Integer inputTokens, Integer outputTokens, LocalDateTime createdAt
) {
    public static ExternalApiUsageResponse from(ExternalApiUsage usage) {
        return new ExternalApiUsageResponse(usage.getId(), usage.getProvider(), usage.getOperation(),
                usage.isSuccess(), usage.getInputTokens(), usage.getOutputTokens(), usage.getCreatedAt());
    }
}
