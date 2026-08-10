package back.backend.domain.admin.dto;

public record AdminDashboardResponse(
        long totalMembers, long activeMembers, long suspendedMembers,
        long totalTrips, long externalApiCallsToday
) {}
