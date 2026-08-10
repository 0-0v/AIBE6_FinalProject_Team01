package back.backend.domain.admin.dto;

import back.backend.domain.member.entity.AuthProvider;
import back.backend.domain.member.entity.Member;
import back.backend.domain.member.entity.MemberRole;
import back.backend.domain.member.entity.MemberStatus;
import java.time.LocalDateTime;

public record AdminMemberSummaryResponse(
        Long id, String email, String nickname, AuthProvider provider, MemberRole role,
        MemberStatus status, LocalDateTime lastLoginAt, LocalDateTime createdAt,
        LocalDateTime suspendedUntil
) {
    public static AdminMemberSummaryResponse from(Member member) {
        return new AdminMemberSummaryResponse(member.getId(), member.getEmail(), member.getNickname(),
                member.getProvider(), member.getRole(), member.getStatus(), member.getLastLoginAt(),
                member.getCreatedAt(), member.getSuspendedUntil());
    }
}
