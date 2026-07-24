package back.backend.domain.member.service;

import back.backend.domain.member.dto.MemberResponse;
import back.backend.domain.member.entity.Member;
import back.backend.domain.member.exception.MemberErrorCode;
import back.backend.domain.member.port.ProfileImageStorage;
import back.backend.domain.member.repository.MemberRepository;
import back.backend.global.exception.BusinessException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
@Transactional(readOnly = true)
public class MemberService {

    private final MemberRepository memberRepository;
    private final ProfileImageStorage profileImageStorage;

    public MemberService(MemberRepository memberRepository, ProfileImageStorage profileImageStorage) {
        this.memberRepository = memberRepository;
        this.profileImageStorage = profileImageStorage;
    }

    public MemberResponse getMember(Long memberId) {
        return MemberResponse.from(getMemberOrThrow(memberId));
    }

    @Transactional
    public MemberResponse updateNickname(Long memberId, String nickname) {
        Member member = getMemberOrThrow(memberId);
        member.changeNickname(nickname);
        return MemberResponse.from(member);
    }

    @Transactional
    public MemberResponse updateProfileImage(Long memberId, MultipartFile file) {
        Member member = getMemberOrThrow(memberId);
        String profileImageUrl = profileImageStorage.store(memberId, file);
        member.changeProfileImage(profileImageUrl);
        return MemberResponse.from(member);
    }

    private Member getMemberOrThrow(Long memberId) {
        return memberRepository.findById(memberId)
                .orElseThrow(() -> new BusinessException(MemberErrorCode.MEMBER_NOT_FOUND));
    }
}
