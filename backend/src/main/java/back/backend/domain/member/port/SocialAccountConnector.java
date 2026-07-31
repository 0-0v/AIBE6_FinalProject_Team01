package back.backend.domain.member.port;

import back.backend.domain.member.entity.Member;

public interface SocialAccountConnector {

    void unlink(Member member);
}
