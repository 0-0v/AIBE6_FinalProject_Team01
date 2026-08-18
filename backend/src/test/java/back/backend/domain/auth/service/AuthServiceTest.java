package back.backend.domain.auth.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.never;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;

import back.backend.domain.auth.dto.TokenResponse;
import back.backend.domain.auth.dto.SignupRequest;
import back.backend.domain.auth.dto.LoginRequest;
import back.backend.domain.auth.dto.PasswordResetRequest;
import back.backend.domain.auth.dto.EmailVerificationPurpose;
import back.backend.domain.auth.exception.SuspendedAccountException;
import back.backend.domain.member.entity.AuthProvider;
import back.backend.domain.member.entity.Member;
import back.backend.domain.member.entity.MemberStatus;
import back.backend.domain.member.repository.MemberRepository;
import back.backend.global.exception.BusinessException;
import back.backend.global.security.jwt.JwtProperties;
import back.backend.global.security.jwt.JwtProvider;
import back.backend.global.security.jwt.RefreshRotationResult;
import back.backend.global.security.jwt.RefreshTokenRepository;
import java.util.Optional;
import java.time.LocalDateTime;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.dao.DataIntegrityViolationException;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    private static final String SECRET = "test-only-secret-key-that-is-at-least-32-bytes";

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    @Mock
    private MemberRepository memberRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private EmailVerificationService emailVerificationService;

    private JwtProvider jwtProvider;
    private AuthService authService;

    @BeforeEach
    void setUp() {
        JwtProperties properties = new JwtProperties();
        properties.setSecret(SECRET);
        properties.setAccessTokenExpirationMs(60_000);
        properties.setRefreshTokenExpirationMs(1_209_600_000);
        jwtProvider = new JwtProvider(properties);
        authService = new AuthService(
                jwtProvider,
                refreshTokenRepository,
                memberRepository,
                passwordEncoder,
                emailVerificationService
        );
    }

    private Member activeMember(Long id) {
        Member member = Member.create(
                "user" + id + "@example.com", "닉네임" + id, null, AuthProvider.GOOGLE, "google-" + id);
        ReflectionTestUtils.setField(member, "id", id);
        return member;
    }

    @Test
    @DisplayName("t1 유효한 리프레시 토큰으로 재발급하면 새 액세스/리프레시 토큰을 반환한다")
    void t1_reissueReturnsNewTokensWhenRefreshTokenIsValid() {
        Member member = activeMember(1L);
        String refreshToken = jwtProvider.createRefreshToken(1L);
        when(memberRepository.findById(1L)).thenReturn(Optional.of(member));
        when(refreshTokenRepository.rotate(eq(1L), eq(refreshToken), any()))
                .thenAnswer(invocation -> RefreshRotationResult.rotated(invocation.getArgument(2)));

        TokenResponse response = authService.reissue(refreshToken);

        assertThat(response.accessToken()).isNotBlank();
        assertThat(response.refreshToken()).isNotBlank();
        assertThat(jwtProvider.getMemberId(response.accessToken())).isEqualTo(1L);
        verify(refreshTokenRepository).rotate(eq(1L), eq(refreshToken), any());
    }

    @Test
    @DisplayName("t2 리프레시 토큰 값이 비어있으면 예외가 발생한다")
    void t2_reissueThrowsWhenRefreshTokenIsBlank() {
        assertThatThrownBy(() -> authService.reissue(" "))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("t3 액세스 토큰으로 재발급을 시도하면 예외가 발생한다")
    void t3_reissueThrowsWhenTokenIsAccessType() {
        String accessToken = jwtProvider.createAccessToken(1L, "user1@example.com");

        assertThatThrownBy(() -> authService.reissue(accessToken))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("t4 유효하지 않은 토큰이면 예외가 발생한다")
    void t4_reissueThrowsWhenTokenIsInvalid() {
        assertThatThrownBy(() -> authService.reissue("not-a-jwt"))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("t5 유예 기간이 지난 리프레시 토큰 재사용이면 회전이 거부되어 예외가 발생한다")
    void t5_reissueThrowsWhenRotationRejectsReusedToken() {
        Member member = activeMember(1L);
        String refreshToken = jwtProvider.createRefreshToken(1L);
        when(memberRepository.findById(1L)).thenReturn(Optional.of(member));
        when(refreshTokenRepository.rotate(eq(1L), eq(refreshToken), any()))
                .thenReturn(RefreshRotationResult.invalid());

        assertThatThrownBy(() -> authService.reissue(refreshToken))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("t6 존재하지 않는 회원의 리프레시 토큰이면 토큰 회전 없이 예외가 발생한다")
    void t6_reissueThrowsWithoutRotatingWhenMemberNotFound() {
        String refreshToken = jwtProvider.createRefreshToken(1L);
        when(memberRepository.findById(1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.reissue(refreshToken))
                .isInstanceOf(BusinessException.class);
        verify(refreshTokenRepository, never()).rotate(any(), any(), any());
    }

    @Test
    @DisplayName("t7 탈퇴한 회원의 리프레시 토큰이면 예외가 발생한다")
    void t7_reissueThrowsWhenMemberIsWithdrawn() {
        Member member = activeMember(1L);
        ReflectionTestUtils.setField(member, "status", MemberStatus.WITHDRAWN);
        String refreshToken = jwtProvider.createRefreshToken(1L);
        when(memberRepository.findById(1L)).thenReturn(Optional.of(member));

        assertThatThrownBy(() -> authService.reissue(refreshToken))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("t8 로그아웃하면 모든 기존 토큰을 무효화하고 리프레시 토큰을 삭제한다")
    void t8_logoutInvalidatesTokensAndDeletesRefreshToken() {
        Member member = activeMember(1L);
        when(memberRepository.findById(1L)).thenReturn(Optional.of(member));

        authService.logout(1L);

        assertThat(member.getTokenVersion()).isEqualTo(1L);
        verify(refreshTokenRepository).deleteByMemberId(1L);
    }

    @Test
    @DisplayName("t9 이메일 인증을 마친 회원가입 요청은 비밀번호를 해시하여 저장하고 토큰을 발급한다")
    void t9_signupHashesPasswordAndIssuesTokens() {
        SignupRequest request = new SignupRequest("USER@example.com", "Password1!", "여행자");
        when(memberRepository.existsByEmail("user@example.com")).thenReturn(false);
        when(passwordEncoder.encode("Password1!")).thenReturn("hashed-password");
        doAnswer(invocation -> {
            Member savedMember = invocation.getArgument(0, Member.class);
            ReflectionTestUtils.setField(savedMember, "id", 10L);
            return savedMember;
        }).when(memberRepository).saveAndFlush(any(Member.class));

        TokenResponse response = authService.signup(request);

        assertThat(response.accessToken()).isNotBlank();
        verify(emailVerificationService)
                .requireVerified("user@example.com", EmailVerificationPurpose.SIGNUP);
        verify(emailVerificationService)
                .consumeVerification("user@example.com", EmailVerificationPurpose.SIGNUP);
        verify(passwordEncoder).encode("Password1!");
    }

    @Test
    @DisplayName("t10 로컬 회원이 올바른 비밀번호로 로그인하면 토큰을 발급한다")
    void t10_loginIssuesTokensWhenPasswordMatches() {
        Member member = Member.createLocal("user@example.com", "여행자", "hashed-password");
        ReflectionTestUtils.setField(member, "id", 11L);
        when(memberRepository.findByEmailAndProvider("user@example.com", AuthProvider.LOCAL))
                .thenReturn(Optional.of(member));
        when(passwordEncoder.matches("Password1!", "hashed-password")).thenReturn(true);

        TokenResponse response = authService.login(new LoginRequest("user@example.com", "Password1!"));

        assertThat(response.accessToken()).isNotBlank();
        assertThat(member.getLastLoginAt()).isNotNull();
        verify(refreshTokenRepository).save(11L, response.refreshToken());
    }

    @Test
    @DisplayName("t11 로컬 회원이 닉네임과 올바른 비밀번호로 로그인하면 토큰을 발급한다")
    void t11_loginIssuesTokensWhenNicknameAndPasswordMatch() {
        Member member = Member.createLocal("user@example.com", "여행자", "hashed-password");
        ReflectionTestUtils.setField(member, "id", 12L);
        when(memberRepository.findByNicknameAndProvider("여행자", AuthProvider.LOCAL))
                .thenReturn(Optional.of(member));
        when(passwordEncoder.matches("Password1!", "hashed-password")).thenReturn(true);

        TokenResponse response = authService.login(new LoginRequest(" 여행자 ", "Password1!"));

        assertThat(response.accessToken()).isNotBlank();
        assertThat(member.getLastLoginAt()).isNotNull();
        verify(refreshTokenRepository).save(12L, response.refreshToken());
    }

    @Test
    @DisplayName("t12 탈퇴한 로컬 회원이 로그인하면 개인정보 보관기간 안내를 반환한다")
    void t12_loginRejectsWithdrawnMemberWithRetentionMessage() {
        Member member = Member.createLocal("user@example.com", "여행자", "hashed-password");
        ReflectionTestUtils.setField(member, "id", 13L);
        ReflectionTestUtils.setField(member, "status", MemberStatus.WITHDRAWN);
        when(memberRepository.findByEmailAndProvider("user@example.com", AuthProvider.LOCAL))
                .thenReturn(Optional.of(member));

        assertThatThrownBy(() -> authService.login(
                new LoginRequest("user@example.com", "Password1!")))
                .isInstanceOf(BusinessException.class)
                .hasMessage(
                        "탈퇴 계정의 개인정보 보관기간이 아직 지나지 않아 같은 이메일 또는 소셜 계정으로 "
                                + "재가입할 수 없습니다. 보관기간이 끝난 후 다시 시도해 주세요.");

        verify(passwordEncoder, never()).matches(any(), any());
    }

    @Test
    @DisplayName("t13 비밀번호 재설정은 새 비밀번호를 해시하고 기존 리프레시 토큰을 폐기한다")
    void t13_resetPasswordHashesPasswordAndRevokesRefreshToken() {
        Member member = Member.createLocal("user@example.com", "여행자", "old-hash");
        ReflectionTestUtils.setField(member, "id", 13L);
        when(memberRepository.findByEmailAndProvider("user@example.com", AuthProvider.LOCAL))
                .thenReturn(Optional.of(member));
        when(passwordEncoder.encode("NewPassword1!")).thenReturn("new-hash");

        authService.resetPassword(new PasswordResetRequest("user@example.com", "NewPassword1!"));

        assertThat(member.getPasswordHash()).isEqualTo("new-hash");
        assertThat(member.getTokenVersion()).isEqualTo(1L);
        verify(refreshTokenRepository).deleteByMemberId(13L);
        verify(emailVerificationService)
                .consumeVerification("user@example.com", EmailVerificationPurpose.PASSWORD_RESET);
    }

    @Test
    @DisplayName("t14 새 비밀번호가 현재 비밀번호와 같으면 비밀번호 재설정을 거부한다")
    void t14_resetPasswordRejectsCurrentPassword() {
        Member member = Member.createLocal("user@example.com", "여행자", "old-hash");
        ReflectionTestUtils.setField(member, "id", 14L);
        when(memberRepository.findByEmailAndProvider("user@example.com", AuthProvider.LOCAL))
                .thenReturn(Optional.of(member));
        when(passwordEncoder.matches("SamePassword1!", "old-hash")).thenReturn(true);

        assertThatThrownBy(() -> authService.resetPassword(
                new PasswordResetRequest("user@example.com", "SamePassword1!")))
                .isInstanceOf(BusinessException.class)
                .hasMessage("이전에 사용하던 비밀번호와 동일한 비밀번호는 사용할 수 없습니다.");

        assertThat(member.getPasswordHash()).isEqualTo("old-hash");
    }

    @Test
    @DisplayName("t15 사용 중인 로컬 닉네임이면 사용할 수 없다고 반환한다")
    void t15_isNicknameAvailableReturnsFalseForExistingLocalNickname() {
        when(memberRepository.existsByNicknameAndProvider("여행자", AuthProvider.LOCAL))
                .thenReturn(true);

        assertThat(authService.isNicknameAvailable(" 여행자 ")).isFalse();
    }

    @Test
    @DisplayName("t16 회원가입 닉네임이 이미 사용 중이면 회원가입을 거부한다")
    void t16_signupRejectsExistingLocalNickname() {
        SignupRequest request = new SignupRequest("user@example.com", "Password1!", "여행자");
        when(memberRepository.existsByEmail("user@example.com")).thenReturn(false);
        when(memberRepository.existsByNicknameAndProvider("여행자", AuthProvider.LOCAL))
                .thenReturn(true);

        assertThatThrownBy(() -> authService.signup(request))
                .isInstanceOf(BusinessException.class)
                .hasMessage("이미 사용 중인 닉네임입니다.");
    }

    @Test
    @DisplayName("t17 동시 회원가입으로 닉네임 유니크 제약이 충돌하면 닉네임 중복 오류를 반환한다")
    void t17_signupMapsNicknameConstraintViolationToNicknameError() {
        SignupRequest request = new SignupRequest("user@example.com", "Password1!", "여행자");
        when(memberRepository.existsByEmail("user@example.com")).thenReturn(false);
        when(memberRepository.existsByNicknameAndProvider("여행자", AuthProvider.LOCAL))
                .thenReturn(false);
        when(passwordEncoder.encode("Password1!")).thenReturn("hashed-password");
        when(memberRepository.saveAndFlush(any(Member.class)))
                .thenThrow(new DataIntegrityViolationException("uk_members_local_nickname"));

        assertThatThrownBy(() -> authService.signup(request))
                .isInstanceOf(BusinessException.class)
                .hasMessage("이미 사용 중인 닉네임입니다.");
    }

    @Test
    @DisplayName("t18 정지된 회원이 로그인하면 정지 사유와 해제 예정 시각을 포함한 예외가 발생한다")
    void t18_suspendedMemberLoginThrowsDetailedSuspensionException() {
        Member member = Member.createLocal("blocked@example.com", "정지회원", "hash");
        ReflectionTestUtils.setField(member, "id", 18L);
        LocalDateTime suspendedUntil = LocalDateTime.now().plusDays(1);
        member.suspend(1L, "비정상적인 API 반복 호출", LocalDateTime.now(), suspendedUntil);
        when(memberRepository.findByEmailAndProvider("blocked@example.com", AuthProvider.LOCAL))
                .thenReturn(Optional.of(member));

        assertThatThrownBy(() -> authService.login(
                new LoginRequest("blocked@example.com", "Password1!")))
                .isInstanceOf(SuspendedAccountException.class)
                .extracting("reason", "suspendedUntil")
                .containsExactly("비정상적인 API 반복 호출", suspendedUntil);
    }

    @Test
    @DisplayName("t19 정지 해제 시각이 지난 회원은 자동 해제 후 정상 로그인한다")
    void t19_expiredSuspensionIsReleasedOnLogin() {
        Member member = Member.createLocal("released@example.com", "해제회원", "hash");
        ReflectionTestUtils.setField(member, "id", 19L);
        member.suspend(1L, "임시 정지", LocalDateTime.now().minusDays(2),
                LocalDateTime.now().minusDays(1));
        when(memberRepository.findByEmailAndProvider("released@example.com", AuthProvider.LOCAL))
                .thenReturn(Optional.of(member));
        when(passwordEncoder.matches("Password1!", "hash")).thenReturn(true);

        TokenResponse response = authService.login(
                new LoginRequest("released@example.com", "Password1!"));

        assertThat(response.accessToken()).isNotBlank();
        assertThat(member.getStatus()).isEqualTo(MemberStatus.ACTIVE);
        assertThat(member.getSuspensionReason()).isNull();
    }

    @Test
    @DisplayName("t20 여러 탭이 거의 동시에 재발급을 요청해 유예 기간 내에 이미 회전된 토큰이 제시되면, "
            + "탈취로 간주하지 않고 이미 발급된 최신 리프레시 토큰을 그대로 반환한다")
    void t20_reissueReturnsAlreadyRotatedTokenForConcurrentTabRequest() {
        Member member = activeMember(1L);
        String staleRefreshToken = jwtProvider.createRefreshToken(1L);
        when(memberRepository.findById(1L)).thenReturn(Optional.of(member));
        when(refreshTokenRepository.rotate(eq(1L), eq(staleRefreshToken), any()))
                .thenReturn(RefreshRotationResult.alreadyRotated("already-rotated-refresh-token"));

        TokenResponse response = authService.reissue(staleRefreshToken);

        assertThat(response.accessToken()).isNotBlank();
        assertThat(response.refreshToken()).isEqualTo("already-rotated-refresh-token");
    }

    @Test
    @DisplayName("t21 회원 토큰 버전과 다른 리프레시 토큰이면 재발급을 거부한다")
    void t21_reissueRejectsStaleTokenVersion() {
        Member member = activeMember(21L);
        String staleRefreshToken = jwtProvider.createRefreshToken(21L, member.getTokenVersion());
        member.invalidateTokens();
        when(memberRepository.findById(21L)).thenReturn(Optional.of(member));

        assertThatThrownBy(() -> authService.reissue(staleRefreshToken))
                .isInstanceOf(BusinessException.class);

        verify(refreshTokenRepository, never()).rotate(any(), any(), any());
    }

}
