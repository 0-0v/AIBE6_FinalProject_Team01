package back.backend.domain.auth.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import back.backend.domain.auth.dto.TokenResponse;
import back.backend.domain.member.entity.AuthProvider;
import back.backend.domain.member.entity.Member;
import back.backend.domain.member.entity.MemberStatus;
import back.backend.domain.member.repository.MemberRepository;
import back.backend.global.exception.BusinessException;
import back.backend.global.security.jwt.JwtProperties;
import back.backend.global.security.jwt.JwtProvider;
import back.backend.global.security.jwt.RefreshTokenRepository;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    private static final String SECRET = "test-only-secret-key-that-is-at-least-32-bytes";

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    @Mock
    private MemberRepository memberRepository;

    private JwtProvider jwtProvider;
    private AuthService authService;

    @BeforeEach
    void setUp() {
        JwtProperties properties = new JwtProperties();
        properties.setSecret(SECRET);
        properties.setAccessTokenExpirationMs(60_000);
        properties.setRefreshTokenExpirationMs(1_209_600_000);
        jwtProvider = new JwtProvider(properties);
        authService = new AuthService(jwtProvider, refreshTokenRepository, memberRepository);
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
        when(refreshTokenRepository.findByMemberId(1L)).thenReturn(Optional.of(refreshToken));
        when(memberRepository.findById(1L)).thenReturn(Optional.of(member));

        TokenResponse response = authService.reissue(refreshToken);

        assertThat(response.accessToken()).isNotBlank();
        assertThat(response.refreshToken()).isNotBlank();
        assertThat(jwtProvider.getMemberId(response.accessToken())).isEqualTo(1L);
        verify(refreshTokenRepository).save(1L, response.refreshToken());
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
    @DisplayName("t5 Redis에 저장된 리프레시 토큰과 일치하지 않으면 재사용으로 간주해 세션을 폐기하고 예외가 발생한다")
    void t5_reissueThrowsAndRevokesSessionWhenStoredTokenDoesNotMatch() {
        String refreshToken = jwtProvider.createRefreshToken(1L);
        when(refreshTokenRepository.findByMemberId(1L)).thenReturn(Optional.of("다른-저장된-토큰"));

        assertThatThrownBy(() -> authService.reissue(refreshToken))
                .isInstanceOf(BusinessException.class);
        verify(refreshTokenRepository).deleteByMemberId(1L);
    }

    @Test
    @DisplayName("t6 Redis에 저장된 리프레시 토큰이 없으면 예외가 발생한다")
    void t6_reissueThrowsWhenStoredTokenNotFound() {
        String refreshToken = jwtProvider.createRefreshToken(1L);
        when(refreshTokenRepository.findByMemberId(1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.reissue(refreshToken))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("t7 탈퇴한 회원의 리프레시 토큰이면 예외가 발생한다")
    void t7_reissueThrowsWhenMemberIsWithdrawn() {
        Member member = activeMember(1L);
        ReflectionTestUtils.setField(member, "status", MemberStatus.WITHDRAWN);
        String refreshToken = jwtProvider.createRefreshToken(1L);
        when(refreshTokenRepository.findByMemberId(1L)).thenReturn(Optional.of(refreshToken));
        when(memberRepository.findById(1L)).thenReturn(Optional.of(member));

        assertThatThrownBy(() -> authService.reissue(refreshToken))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("t8 로그아웃하면 회원 식별자로 리프레시 토큰을 삭제한다")
    void t8_logoutDeletesRefreshTokenByMemberId() {
        authService.logout(1L);

        verify(refreshTokenRepository).deleteByMemberId(1L);
    }
}
