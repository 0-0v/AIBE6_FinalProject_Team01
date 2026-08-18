package back.backend.domain.auth.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import back.backend.domain.auth.exception.AuthErrorCode;
import back.backend.global.exception.BusinessException;
import back.backend.global.redis.RedisValueService;
import java.time.Duration;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class OAuthLoginCodeServiceTest {

    @Mock
    private RedisValueService redisValueService;

    private OAuthLoginCodeService oAuthLoginCodeService;

    @BeforeEach
    void setUp() {
        oAuthLoginCodeService = new OAuthLoginCodeService(redisValueService);
    }

    @Test
    @DisplayName("t1 액세스 토큰을 발급하면 짧은 만료시간의 1회용 코드로 Redis에 저장하고 코드를 반환한다")
    void t1_issueStoresAccessTokenWithShortLivedCode() {
        ArgumentCaptor<Duration> ttlCaptor = ArgumentCaptor.forClass(Duration.class);

        String code = oAuthLoginCodeService.issue("access-token");

        assertThat(code).isNotBlank();
        verify(redisValueService).set(anyString(), eq("access-token"), ttlCaptor.capture());
        assertThat(ttlCaptor.getValue()).isLessThanOrEqualTo(Duration.ofMinutes(1));
    }

    @Test
    @DisplayName("t2 유효한 코드를 교환하면 저장된 액세스 토큰을 반환하고 즉시 삭제한다")
    void t2_consumeReturnsAccessTokenAndDeletesCodeOnce() {
        when(redisValueService.getAndDelete(anyString())).thenReturn(Optional.of("access-token"));

        String accessToken = oAuthLoginCodeService.consume("issued-code");

        assertThat(accessToken).isEqualTo("access-token");
        verify(redisValueService).getAndDelete(anyString());
    }

    @Test
    @DisplayName("t3 코드가 없거나 이미 사용되었거나 만료되었으면 예외를 던진다")
    void t3_consumeThrowsWhenCodeInvalid() {
        when(redisValueService.getAndDelete(anyString())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> oAuthLoginCodeService.consume("missing-code"))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", AuthErrorCode.OAUTH_LOGIN_CODE_INVALID);
    }
}
