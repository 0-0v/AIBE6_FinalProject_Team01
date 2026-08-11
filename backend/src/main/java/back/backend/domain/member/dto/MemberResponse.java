package back.backend.domain.member.dto;

import back.backend.domain.member.entity.AuthProvider;
import back.backend.domain.member.entity.Member;
import back.backend.domain.member.entity.MemberRole;
import back.backend.domain.member.entity.MemberStatus;

public record MemberResponse(
        Long id,
        String email,
        String nickname,
        String profileImageUrl,
        AuthProvider provider,
        MemberRole role,
        MemberStatus status
) {

    public MemberResponse(
            Long id,
            String email,
            String nickname,
            String profileImageUrl,
            AuthProvider provider
    ) {
        this(id, email, nickname, profileImageUrl, provider, MemberRole.USER, MemberStatus.ACTIVE);
    }

    public static MemberResponse from(Member member) {
        return new MemberResponse(
                member.getId(),
                member.getEmail(),
                member.getNickname(),
                member.getProfileImageUrl(),
                member.getProvider(),
                member.getRole(),
                member.getStatus()
        );
    }
}
