package back.backend.domain.auth.service;

import static org.assertj.core.api.Assertions.assertThat;

import back.backend.domain.auth.config.LoginAttemptProperties;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ClientIpResolverTest {

    @Mock
    private HttpServletRequest request;

    private ClientIpResolver resolver;

    @BeforeEach
    void setUp() {
        LoginAttemptProperties properties = new LoginAttemptProperties();
        properties.setTrustedProxies(List.of("127.0.0.1", "172.18.0.5"));
        resolver = new ClientIpResolver(properties);
    }

    @Test
    @DisplayName("t1 신뢰 프록시 요청은 X-Forwarded-For의 첫 번째 주소를 사용한다")
    void t1_trustedProxyUsesFirstForwardedAddress() {
        when(request.getRemoteAddr()).thenReturn("172.18.0.5");
        when(request.getHeader("X-Forwarded-For")).thenReturn("203.0.113.9, 172.18.0.5");

        assertThat(resolver.resolve(request)).isEqualTo("203.0.113.9");
    }

    @Test
    @DisplayName("t2 신뢰하지 않는 요청은 위조된 X-Forwarded-For를 무시한다")
    void t2_untrustedClientIgnoresForwardedAddress() {
        when(request.getRemoteAddr()).thenReturn("198.51.100.4");

        assertThat(resolver.resolve(request)).isEqualTo("198.51.100.4");
    }
}
