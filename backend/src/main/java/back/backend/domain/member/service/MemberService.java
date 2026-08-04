package back.backend.domain.member.service;

import back.backend.domain.member.config.MemberWithdrawalProperties;
import back.backend.domain.member.dto.MemberResponse;
import back.backend.domain.member.entity.Member;
import back.backend.domain.member.entity.AuthProvider;
import back.backend.domain.member.exception.MemberErrorCode;
import back.backend.domain.member.port.ProfileImageStorage;
import back.backend.domain.member.port.SocialAccountConnector;
import back.backend.domain.member.repository.MemberRepository;
import back.backend.global.exception.BusinessException;
import back.backend.global.security.jwt.RefreshTokenRepository;
import java.time.Clock;
import java.time.LocalDateTime;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
@Transactional(readOnly = true)
public class MemberService {

    private final MemberRepository memberRepository;
    private final ProfileImageStorage profileImageStorage;
    private final RefreshTokenRepository refreshTokenRepository;
    private final SocialAccountConnector socialAccountConnector;
    private final MemberWithdrawalProperties withdrawalProperties;
    private final Clock clock;

    public MemberService(
            MemberRepository memberRepository,
            ProfileImageStorage profileImageStorage,
            RefreshTokenRepository refreshTokenRepository,
            SocialAccountConnector socialAccountConnector,
            MemberWithdrawalProperties withdrawalProperties,
            Clock clock
    ) {
        this.memberRepository = memberRepository;
        this.profileImageStorage = profileImageStorage;
        this.refreshTokenRepository = refreshTokenRepository;
        this.socialAccountConnector = socialAccountConnector;
        this.withdrawalProperties = withdrawalProperties;
        this.clock = clock;
    }

    public MemberResponse getMember(Long memberId) {
        return MemberResponse.from(getMemberOrThrow(memberId));
    }

    @Transactional
    public MemberResponse updateNickname(Long memberId, String nickname) {
        Member member = getMemberOrThrow(memberId);
        String normalizedNickname = nickname.strip();
        if (!isNicknameAvailable(memberId, normalizedNickname)) {
            throw new BusinessException(MemberErrorCode.NICKNAME_ALREADY_EXISTS);
        }
        member.changeNickname(normalizedNickname);
        return MemberResponse.from(member);
    }

    public boolean isNicknameAvailable(Long memberId, String nickname) {
        return !memberRepository.existsByNicknameAndIdNot(nickname.strip(), memberId);
    }

    @Transactional
    public MemberResponse updateProfileImage(Long memberId, MultipartFile file) {
        Member member = getMemberOrThrow(memberId);
        String profileImageUrl = profileImageStorage.store(memberId, file);
        member.changeProfileImage(profileImageUrl);
        return MemberResponse.from(member);
    }

    @Transactional
    public void withdraw(Long memberId) {
        Member member = getMemberOrThrow(memberId);
        if (member.getProvider() != AuthProvider.LOCAL) {
            socialAccountConnector.unlink(member);
        }
        LocalDateTime withdrawnAt = LocalDateTime.now(clock);
        member.withdraw(withdrawnAt, withdrawnAt.plusDays(withdrawalProperties.getRetentionDays()));
        refreshTokenRepository.deleteByMemberId(memberId);
        if (withdrawalProperties.getRetentionDays() == 0) {
            String profileImageUrl = member.anonymizePersonalInfo(withdrawnAt);
            profileImageStorage.delete(profileImageUrl);
        }
    }

    @Transactional
    public int purgeExpiredPersonalInfo(LocalDateTime now) {
        var expiredMembers =
                memberRepository.findAllByStatusAndPersonalInfoExpiresAtLessThanEqualAndPersonalInfoDeletedAtIsNull(
                        back.backend.domain.member.entity.MemberStatus.WITHDRAWN,
                        now);
        expiredMembers.forEach(member -> {
            String profileImageUrl = member.anonymizePersonalInfo(now);
            profileImageStorage.delete(profileImageUrl);
        });
        return expiredMembers.size();
    }

    private Member getMemberOrThrow(Long memberId) {
        return memberRepository.findById(memberId)
                .orElseThrow(() -> new BusinessException(MemberErrorCode.MEMBER_NOT_FOUND));
    }
}
