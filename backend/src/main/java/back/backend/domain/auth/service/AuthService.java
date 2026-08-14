package back.backend.domain.auth.service;

import back.backend.domain.auth.dto.EmailVerificationPurpose;
import back.backend.domain.auth.dto.LoginRequest;
import back.backend.domain.auth.dto.PasswordResetRequest;
import back.backend.domain.auth.dto.SignupRequest;
import back.backend.domain.auth.dto.TokenResponse;
import back.backend.domain.auth.exception.AuthErrorCode;
import back.backend.domain.auth.exception.SuspendedAccountException;
import back.backend.domain.member.entity.AuthProvider;
import back.backend.domain.member.entity.Member;
import back.backend.domain.member.entity.MemberStatus;
import back.backend.domain.member.entity.MemberRole;
import back.backend.domain.member.repository.MemberRepository;
import back.backend.global.exception.BusinessException;
import back.backend.global.exception.CommonErrorCode;
import back.backend.global.exception.DataIntegrityConstraintMatcher;
import back.backend.global.security.jwt.JwtProvider;
import back.backend.global.security.jwt.RefreshRotationResult;
import back.backend.global.security.jwt.RefreshTokenRepository;
import back.backend.global.security.jwt.TokenType;
import org.springframework.stereotype.Service;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;

@Service
public class AuthService {

    private static final String INVALID_REFRESH_TOKEN_MESSAGE = "유효하지 않은 리프레시 토큰입니다.";

    private final JwtProvider jwtProvider;
    private final RefreshTokenRepository refreshTokenRepository;
    private final MemberRepository memberRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailVerificationService emailVerificationService;

    public AuthService(
            JwtProvider jwtProvider,
            RefreshTokenRepository refreshTokenRepository,
            MemberRepository memberRepository,
            PasswordEncoder passwordEncoder,
            EmailVerificationService emailVerificationService
    ) {
        this.jwtProvider = jwtProvider;
        this.refreshTokenRepository = refreshTokenRepository;
        this.memberRepository = memberRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailVerificationService = emailVerificationService;
    }

    @Transactional
    public TokenResponse signup(SignupRequest request) {
        String email = EmailVerificationService.normalize(request.email());
        emailVerificationService.requireVerified(email, EmailVerificationPurpose.SIGNUP);
        if (memberRepository.existsByEmail(email)) {
            throw new BusinessException(AuthErrorCode.EMAIL_ALREADY_EXISTS);
        }
        String nickname = request.nickname().strip();
        if (!isNicknameAvailable(nickname)) {
            throw new BusinessException(AuthErrorCode.NICKNAME_ALREADY_EXISTS);
        }
        Member member = Member.createLocal(email, nickname, passwordEncoder.encode(request.password()));
        try {
            memberRepository.saveAndFlush(member);
        } catch (DataIntegrityViolationException exception) {
            if (DataIntegrityConstraintMatcher.containsConstraint(
                    exception, "uk_members_local_nickname")) {
                throw new BusinessException(AuthErrorCode.NICKNAME_ALREADY_EXISTS);
            }
            throw new BusinessException(AuthErrorCode.EMAIL_ALREADY_EXISTS);
        }
        emailVerificationService.consumeVerification(email, EmailVerificationPurpose.SIGNUP);
        return issueTokens(member);
    }

    @Transactional(readOnly = true)
    public boolean isNicknameAvailable(String nickname) {
        return !memberRepository.existsByNicknameAndProvider(nickname.strip(), AuthProvider.LOCAL);
    }

    @Transactional
    public TokenResponse login(LoginRequest request) {
        String identifier = request.identifier().strip();
        Member member = (identifier.contains("@")
                ? memberRepository.findByEmailAndProvider(
                        EmailVerificationService.normalize(identifier), AuthProvider.LOCAL)
                : memberRepository.findByNicknameAndProvider(identifier, AuthProvider.LOCAL))
                .orElseThrow(() -> new BusinessException(AuthErrorCode.INVALID_CREDENTIALS));
        if (member.getStatus() == MemberStatus.WITHDRAWN) {
            throw new BusinessException(AuthErrorCode.WITHDRAWN_ACCOUNT);
        }
        member.releaseSuspensionIfExpired(java.time.LocalDateTime.now());
        if (member.getStatus() == MemberStatus.SUSPENDED) {
            throw new SuspendedAccountException(member);
        }
        if (!passwordEncoder.matches(request.password(), member.getPasswordHash())) {
            throw new BusinessException(AuthErrorCode.INVALID_CREDENTIALS);
        }
        if (member.getRole() == MemberRole.ADMIN) {
            throw new BusinessException(AuthErrorCode.ADMIN_OTP_REQUIRED);
        }
        member.recordLogin();
        return issueTokens(member);
    }

    @Transactional(readOnly = true)
    public Member requireAdminCredentials(LoginRequest request) {
        String identifier = request.identifier().strip();
        Member member = (identifier.contains("@")
                ? memberRepository.findByEmailAndProvider(
                        EmailVerificationService.normalize(identifier), AuthProvider.LOCAL)
                : memberRepository.findByNicknameAndProvider(identifier, AuthProvider.LOCAL))
                .orElseThrow(() -> new BusinessException(AuthErrorCode.INVALID_CREDENTIALS));
        if (member.getStatus() != MemberStatus.ACTIVE
                || member.getRole() != MemberRole.ADMIN
                || !passwordEncoder.matches(request.password(), member.getPasswordHash())) {
            throw new BusinessException(AuthErrorCode.INVALID_CREDENTIALS);
        }
        return member;
    }

    @Transactional(readOnly = true)
    public Member requireSubAdmin(Long memberId) {
        return memberRepository.findById(memberId)
                .filter(member -> member.getStatus() == MemberStatus.ACTIVE)
                .filter(member -> member.getRole() == MemberRole.SUB_ADMIN)
                .orElseThrow(() -> new BusinessException(AuthErrorCode.INVALID_CREDENTIALS));
    }

    @Transactional
    public TokenResponse completeAdminLogin(Long memberId) {
        Member member = memberRepository.findById(memberId)
                .filter(found -> found.getStatus() == MemberStatus.ACTIVE)
                .filter(found -> found.getRole() == MemberRole.ADMIN
                        || found.getRole() == MemberRole.SUB_ADMIN)
                .orElseThrow(() -> new BusinessException(AuthErrorCode.INVALID_CREDENTIALS));
        member.recordLogin();
        return issueTokens(member, true);
    }

    @Transactional
    public void resetPassword(PasswordResetRequest request) {
        String email = EmailVerificationService.normalize(request.email());
        emailVerificationService.requireVerified(email, EmailVerificationPurpose.PASSWORD_RESET);
        Member member = memberRepository.findByEmailAndProvider(email, AuthProvider.LOCAL)
                .orElseThrow(() -> new BusinessException(AuthErrorCode.LOCAL_ACCOUNT_NOT_FOUND));
        if (passwordEncoder.matches(request.newPassword(), member.getPasswordHash())) {
            throw new BusinessException(AuthErrorCode.SAME_AS_CURRENT_PASSWORD);
        }
        member.changePassword(passwordEncoder.encode(request.newPassword()));
        memberRepository.flush();
        refreshTokenRepository.deleteByMemberId(member.getId());
        emailVerificationService.consumeVerification(email, EmailVerificationPurpose.PASSWORD_RESET);
    }

    public TokenResponse reissue(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new BusinessException(CommonErrorCode.BAD_REQUEST, "리프레시 토큰은 필수입니다.");
        }
        if (!jwtProvider.isValid(refreshToken) || jwtProvider.getTokenType(refreshToken) != TokenType.REFRESH) {
            throw new BusinessException(CommonErrorCode.UNAUTHORIZED, INVALID_REFRESH_TOKEN_MESSAGE);
        }

        Long memberId = jwtProvider.getMemberId(refreshToken);
        Member member = memberRepository.findById(memberId)
                .filter(found -> found.getStatus() == MemberStatus.ACTIVE)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.UNAUTHORIZED, INVALID_REFRESH_TOKEN_MESSAGE));
        if (member.getTokenVersion() != jwtProvider.getTokenVersion(refreshToken)) {
            throw new BusinessException(CommonErrorCode.UNAUTHORIZED, INVALID_REFRESH_TOKEN_MESSAGE);
        }

        Instant adminVerifiedUntil = jwtProvider.getAdminVerifiedUntil(refreshToken);
        if (adminVerifiedUntil != null && (!Instant.now().isBefore(adminVerifiedUntil)
                || member.getRole() == MemberRole.USER)) {
            adminVerifiedUntil = null;
        }
        String newAccessToken = jwtProvider.createAccessToken(
                member.getId(), member.getEmail(), adminVerifiedUntil, member.getTokenVersion());
        String candidateRefreshToken = jwtProvider.createRefreshToken(
                member.getId(), adminVerifiedUntil, member.getTokenVersion());

        // 같은 리프레시 토큰으로 여러 탭이 거의 동시에 재발급을 요청해도 서로를 탈취로
        // 오인해 세션 전체가 로그아웃되지 않도록, 회전을 원자적으로 처리하고 짧은 유예
        // 기간 동안은 직전에 폐기된 토큰의 재요청을 정상 동시 요청으로 취급한다.
        RefreshRotationResult rotation =
                refreshTokenRepository.rotate(memberId, refreshToken, candidateRefreshToken);
        if (!rotation.isValid()) {
            // 유예 기간이 지난 폐기 토큰의 재사용은 탈취 가능성이 높으므로 세션을 강제 폐기한다.
            throw new BusinessException(CommonErrorCode.UNAUTHORIZED, INVALID_REFRESH_TOKEN_MESSAGE);
        }

        return new TokenResponse(newAccessToken, rotation.refreshToken());
    }

    @Transactional
    public void logout(Long memberId) {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new BusinessException(
                        CommonErrorCode.UNAUTHORIZED, "인증된 회원을 찾을 수 없습니다."));
        member.invalidateTokens();
        refreshTokenRepository.deleteByMemberId(memberId);
    }

    private TokenResponse issueTokens(Member member) {
        return issueTokens(member, false);
    }

    private TokenResponse issueTokens(Member member, boolean adminVerified) {
        String accessToken = jwtProvider.createAccessToken(
                member.getId(), member.getEmail(), adminVerified, member.getTokenVersion());
        String refreshToken = jwtProvider.createRefreshToken(
                member.getId(), adminVerified, member.getTokenVersion());
        refreshTokenRepository.save(member.getId(), refreshToken);
        return new TokenResponse(accessToken, refreshToken);
    }
}
