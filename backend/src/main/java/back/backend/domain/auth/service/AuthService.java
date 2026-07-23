package back.backend.domain.auth.service;

import back.backend.domain.auth.dto.TokenResponse;
import back.backend.domain.member.entity.Member;
import back.backend.domain.member.entity.MemberStatus;
import back.backend.domain.member.repository.MemberRepository;
import back.backend.global.exception.BusinessException;
import back.backend.global.exception.CommonErrorCode;
import back.backend.global.security.jwt.JwtProvider;
import back.backend.global.security.jwt.RefreshTokenRepository;
import back.backend.global.security.jwt.TokenType;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private static final String INVALID_REFRESH_TOKEN_MESSAGE = "유효하지 않은 리프레시 토큰입니다.";

    private final JwtProvider jwtProvider;
    private final RefreshTokenRepository refreshTokenRepository;
    private final MemberRepository memberRepository;

    public AuthService(
            JwtProvider jwtProvider,
            RefreshTokenRepository refreshTokenRepository,
            MemberRepository memberRepository
    ) {
        this.jwtProvider = jwtProvider;
        this.refreshTokenRepository = refreshTokenRepository;
        this.memberRepository = memberRepository;
    }

    public TokenResponse reissue(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new BusinessException(CommonErrorCode.BAD_REQUEST, "리프레시 토큰은 필수입니다.");
        }
        if (!jwtProvider.isValid(refreshToken) || jwtProvider.getTokenType(refreshToken) != TokenType.REFRESH) {
            throw new BusinessException(CommonErrorCode.UNAUTHORIZED, INVALID_REFRESH_TOKEN_MESSAGE);
        }

        Long memberId = jwtProvider.getMemberId(refreshToken);
        String storedRefreshToken = refreshTokenRepository.findByMemberId(memberId)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.UNAUTHORIZED, INVALID_REFRESH_TOKEN_MESSAGE));
        if (!storedRefreshToken.equals(refreshToken)) {
            // Rotation 이후 폐기된 토큰의 재사용은 탈취 가능성이 높으므로 현재 세션까지 강제 폐기한다.
            refreshTokenRepository.deleteByMemberId(memberId);
            throw new BusinessException(CommonErrorCode.UNAUTHORIZED, INVALID_REFRESH_TOKEN_MESSAGE);
        }

        Member member = memberRepository.findById(memberId)
                .filter(found -> found.getStatus() == MemberStatus.ACTIVE)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.UNAUTHORIZED, INVALID_REFRESH_TOKEN_MESSAGE));

        String newAccessToken = jwtProvider.createAccessToken(member.getId(), member.getEmail());
        String newRefreshToken = jwtProvider.createRefreshToken(member.getId());
        refreshTokenRepository.save(member.getId(), newRefreshToken);

        return new TokenResponse(newAccessToken, newRefreshToken);
    }

    public void logout(Long memberId) {
        refreshTokenRepository.deleteByMemberId(memberId);
    }
}
