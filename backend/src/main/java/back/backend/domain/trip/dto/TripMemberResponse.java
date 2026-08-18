package back.backend.domain.trip.dto;

public record TripMemberResponse(
        Long memberId,
        String nickname,
        String profileImageUrl,
        boolean online,
        boolean guest
) {
}
