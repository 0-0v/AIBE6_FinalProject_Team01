package back.backend.domain.auth.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import back.backend.domain.auth.config.LoginAttemptProperties;
import back.backend.domain.auth.dto.LoginRequest;
import back.backend.domain.auth.dto.TokenResponse;
import back.backend.domain.auth.exception.AuthErrorCode;
import back.backend.domain.auth.exception.LoginRateLimitException;
import back.backend.global.exception.BusinessException;
import back.backend.global.redis.RedisValueService;
import java.time.Duration;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class LoginAttemptServiceTest {

    @Mock
    private AuthService authService;

    @Mock
    private RedisValueService redisValueService;

    private LoginAttemptService loginAttemptService;
    private LoginRequest request;

    @BeforeEach
    void setUp() {
        LoginAttemptProperties properties = new LoginAttemptProperties();
        properties.setIdentifierMaxFailures(5);
        properties.setIpMaxFailures(30);
        properties.setWindow(Duration.ofMinutes(10));
        loginAttemptService = new LoginAttemptService(authService, redisValueService, properties);
        request = new LoginRequest("User@Example.com", "Password1!");
    }

    @Test
    @DisplayName("t1 로그인 성공 시 IP와 식별자 조합의 실패 횟수를 초기화한다")
    void t1_successfulLoginClearsIdentifierFailureCount() {
        TokenResponse tokens = new TokenResponse("access", "refresh");
        when(authService.login(request)).thenReturn(tokens);

        TokenResponse result = loginAttemptService.login(request, "203.0.113.7");

        assertThat(result).isSameAs(tokens);
        verify(redisValueService).delete(any(String.class));
    }

    @Test
    @DisplayName("t2 잘못된 자격 증명 실패가 기준에 도달하면 429와 재시도 시간을 반환한다")
    void t2_invalidCredentialsAtLimitReturnsRateLimitException() {
        when(authService.login(request))
                .thenThrow(new BusinessException(AuthErrorCode.INVALID_CREDENTIALS));
        when(redisValueService.increment(any(String.class), any(Duration.class)))
                .thenReturn(5L, 5L);
        when(redisValueService.remainingTtl(any(String.class)))
                .thenReturn(Optional.of(Duration.ofSeconds(241)));

        assertThatThrownBy(() -> loginAttemptService.login(request, "203.0.113.7"))
                .isInstanceOfSatisfying(LoginRateLimitException.class,
                        exception -> assertThat(exception.getRetryAfterSeconds()).isEqualTo(241));
    }

    @Test
    @DisplayName("t3 제한된 요청은 인증을 수행하지 않고 429를 반환한다")
    void t3_blockedRequestSkipsAuthentication() {
        when(redisValueService.get(any(String.class))).thenReturn(Optional.of("5"));
        when(redisValueService.remainingTtl(any(String.class)))
                .thenReturn(Optional.of(Duration.ofSeconds(120)));

        assertThatThrownBy(() -> loginAttemptService.login(request, "203.0.113.7"))
                .isInstanceOf(LoginRateLimitException.class);

        verify(authService, never()).login(request);
    }

    @Test
    @DisplayName("t4 정지 등 자격 증명 외 로그인 실패는 무차별 대입 횟수에 포함하지 않는다")
    void t4_nonCredentialFailureDoesNotIncreaseFailureCount() {
        when(authService.login(request))
                .thenThrow(new BusinessException(AuthErrorCode.WITHDRAWN_ACCOUNT));

        assertThatThrownBy(() -> loginAttemptService.login(request, "203.0.113.7"))
                .isInstanceOf(BusinessException.class)
                .hasMessage(AuthErrorCode.WITHDRAWN_ACCOUNT.getMessage());

        verify(redisValueService, never()).increment(any(String.class), any(Duration.class));
    }
}
