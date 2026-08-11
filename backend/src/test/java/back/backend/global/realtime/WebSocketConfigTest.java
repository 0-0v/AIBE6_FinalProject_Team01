package back.backend.global.realtime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import back.backend.global.security.CorsProperties;
import back.backend.global.security.jwt.JwtProvider;
import back.backend.global.security.jwt.TokenType;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.Message;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.messaging.support.MessageHeaderAccessor;

class WebSocketConfigTest {

    @Test
    @DisplayName("t1 CONNECT 인증 사용자는 실제 STOMP 메시지 헤더에 유지된다")
    void t1_connectAuthenticationPersistsPrincipalInMessageHeaders() {
        JwtProvider jwtProvider = mock(JwtProvider.class);
        when(jwtProvider.isValid("access-token")).thenReturn(true);
        when(jwtProvider.getTokenType("access-token")).thenReturn(TokenType.ACCESS);
        when(jwtProvider.getMemberId("access-token")).thenReturn(7L);
        WebSocketConfig config = new WebSocketConfig(
                jwtProvider,
                mock(CorsProperties.class),
                mock(TripSubscriptionAuthorizer.class)
        );
        TestChannelRegistration registration = new TestChannelRegistration();
        config.configureClientInboundChannel(registration);

        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        accessor.setNativeHeader("Authorization", "Bearer access-token");
        Message<byte[]> message = MessageBuilder.createMessage(
                new byte[0],
                accessor.getMessageHeaders()
        );

        Message<?> intercepted = registration.interceptor().preSend(message, mock(org.springframework.messaging.MessageChannel.class));
        StompHeaderAccessor resultAccessor =
                MessageHeaderAccessor.getAccessor(intercepted, StompHeaderAccessor.class);

        assertThat(resultAccessor).isNotNull();
        assertThat(resultAccessor.getUser()).isNotNull();
        assertThat(resultAccessor.getUser().getName()).isEqualTo("7");
    }

    private static class TestChannelRegistration extends ChannelRegistration {
        private ChannelInterceptor interceptor() {
            List<ChannelInterceptor> interceptors = getInterceptors();
            assertThat(interceptors).hasSize(1);
            return interceptors.getFirst();
        }
    }
}
