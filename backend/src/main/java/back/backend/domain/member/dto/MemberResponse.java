package back.backend.domain.member.dto;

import back.backend.domain.member.entity.AuthProvider;
import back.backend.domain.member.entity.Member;

public record MemberResponse(Long id, String email, String nickname, String profileImageUrl, AuthProvider provider) {

    public static MemberResponse from(Member member) {
        return new MemberResponse(
                member.getId(),
                member.getEmail(),
                member.getNickname(),
                member.getProfileImageUrl(),
                member.getProvider()
        );
    }
}
