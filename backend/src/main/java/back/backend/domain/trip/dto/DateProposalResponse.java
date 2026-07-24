package back.backend.domain.trip.dto;

import java.time.LocalDate;

public record DateProposalResponse(
        Long proposalId,
        LocalDate startDate,
        LocalDate endDate,
        String status,
        int agreeCount,
        int disagreeCount,
        int requiredCount,
        DateVoteRequest.Choice myChoice
) {
}
