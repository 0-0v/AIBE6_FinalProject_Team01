package back.backend.domain.admin.dto;

import back.backend.domain.admin.entity.ExternalApiProvider;
import back.backend.domain.admin.entity.ExternalApiUsage;
import java.time.LocalDateTime;

public record ExternalApiUsageResponse(
        Long id, Long memberId, String memberNickname, ExternalApiProvider provider, String operation, boolean success,
        Integer inputTokens, Integer outputTokens, LocalDateTime createdAt
) {
    public static ExternalApiUsageResponse from(ExternalApiUsage usage) {
        return from(usage, null);
    }

    public static ExternalApiUsageResponse from(ExternalApiUsage usage, String memberNickname) {
        return new ExternalApiUsageResponse(usage.getId(), usage.getMemberId(), memberNickname,
                usage.getProvider(), usage.getOperation(),
                usage.isSuccess(), usage.getInputTokens(), usage.getOutputTokens(), usage.getCreatedAt());
    }
}
