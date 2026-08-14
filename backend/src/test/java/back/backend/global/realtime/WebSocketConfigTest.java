package back.backend.global.realtime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import back.backend.domain.member.entity.Member;
import back.backend.domain.member.entity.MemberStatus;
import back.backend.domain.member.repository.MemberRepository;
import back.backend.global.security.CorsProperties;
import back.backend.global.security.jwt.JwtProvider;
import back.backend.global.security.jwt.TokenType;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.messaging.support.MessageHeaderAccessor;

class WebSocketConfigTest {

    @Test
    @DisplayName("t1 CONNECT 인증 사용자는 실제 STOMP 메시지 헤더에 유지한다")
    void t1_connectAuthenticationPersistsPrincipalInMessageHeaders() {
        JwtProvider jwtProvider = accessTokenProvider();
        MemberRepository memberRepository = activeMemberRepository();
        WebSocketConfig config = config(
                jwtProvider, memberRepository, mock(TripSubscriptionAuthorizer.class),
                new RevokedWebSocketMemberRegistry());
        TestChannelRegistration registration = registration(config);
        Message<byte[]> message = message(StompCommand.CONNECT, null, null, "access-token");

        Message<?> intercepted = registration.interceptor().preSend(message, mock(MessageChannel.class));
        StompHeaderAccessor result = MessageHeaderAccessor.getAccessor(
                intercepted, StompHeaderAccessor.class);

        assertThat(result).isNotNull();
        assertThat(result.getUser()).isNotNull();
        assertThat(result.getUser().getName()).isEqualTo("7");
    }

    @Test
    @DisplayName("t2 SEND 메시지는 목적지와 인증 사용자의 여행방 권한을 검증한다")
    void t2_sendMessageChecksTripAuthorization() {
        TripSubscriptionAuthorizer authorizer = mock(TripSubscriptionAuthorizer.class);
        WebSocketConfig config = config(
                mock(JwtProvider.class), mock(MemberRepository.class), authorizer,
                new RevokedWebSocketMemberRegistry());
        TestChannelRegistration registration = registration(config);
        java.security.Principal principal = () -> "7";
        Message<byte[]> message = message(
                StompCommand.SEND, "/app/trip-awareness/10", principal, null);

        registration.interceptor().preSend(message, mock(MessageChannel.class));

        verify(authorizer).authorize("/app/trip-awareness/10", principal);
    }

    @Test
    @DisplayName("t3 정지 회원의 기존 액세스 토큰으로 WebSocket 재연결을 거부한다")
    void t3_suspendedMemberCannotReconnectWithStaleAccessToken() {
        JwtProvider jwtProvider = accessTokenProvider();
        Member member = mock(Member.class);
        when(member.getStatus()).thenReturn(MemberStatus.SUSPENDED);
        MemberRepository memberRepository = mock(MemberRepository.class);
        when(memberRepository.findById(7L)).thenReturn(Optional.of(member));
        WebSocketConfig config = config(
                jwtProvider, memberRepository, mock(TripSubscriptionAuthorizer.class),
                new RevokedWebSocketMemberRegistry());
        TestChannelRegistration registration = registration(config);
        Message<byte[]> message = message(StompCommand.CONNECT, null, null, "access-token");

        assertThatThrownBy(() -> registration.interceptor().preSend(
                message, mock(MessageChannel.class)))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("t4 연결 이후 정지된 회원의 WebSocket 메시지 전송을 즉시 거부한다")
    void t4_suspendedConnectedMemberCannotSendMessage() {
        RevokedWebSocketMemberRegistry registry = new RevokedWebSocketMemberRegistry();
        registry.revoke(7L);
        WebSocketConfig config = config(
                mock(JwtProvider.class), mock(MemberRepository.class),
                mock(TripSubscriptionAuthorizer.class), registry);
        TestChannelRegistration registration = registration(config);
        Message<byte[]> message = message(
                StompCommand.SEND, "/app/trip-awareness/10", () -> "7", null);

        assertThatThrownBy(() -> registration.interceptor().preSend(
                message, mock(MessageChannel.class)))
                .isInstanceOf(IllegalArgumentException.class);
    }

    private JwtProvider accessTokenProvider() {
        JwtProvider provider = mock(JwtProvider.class);
        when(provider.isValid("access-token")).thenReturn(true);
        when(provider.getTokenType("access-token")).thenReturn(TokenType.ACCESS);
        when(provider.getMemberId("access-token")).thenReturn(7L);
        when(provider.getTokenVersion("access-token")).thenReturn(3L);
        return provider;
    }

    private MemberRepository activeMemberRepository() {
        Member member = mock(Member.class);
        when(member.getStatus()).thenReturn(MemberStatus.ACTIVE);
        when(member.getTokenVersion()).thenReturn(3L);
        MemberRepository repository = mock(MemberRepository.class);
        when(repository.findById(7L)).thenReturn(Optional.of(member));
        return repository;
    }

    private WebSocketConfig config(
            JwtProvider jwtProvider,
            MemberRepository memberRepository,
            TripSubscriptionAuthorizer authorizer,
            RevokedWebSocketMemberRegistry registry
    ) {
        return new WebSocketConfig(
                jwtProvider, memberRepository, mock(CorsProperties.class), authorizer, registry);
    }

    private TestChannelRegistration registration(WebSocketConfig config) {
        TestChannelRegistration registration = new TestChannelRegistration();
        config.configureClientInboundChannel(registration);
        return registration;
    }

    private Message<byte[]> message(
            StompCommand command,
            String destination,
            java.security.Principal principal,
            String token
    ) {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(command);
        if (destination != null) accessor.setDestination(destination);
        if (principal != null) accessor.setUser(principal);
        if (token != null) accessor.setNativeHeader("Authorization", "Bearer " + token);
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }

    private static class TestChannelRegistration extends ChannelRegistration {
        private ChannelInterceptor interceptor() {
            List<ChannelInterceptor> interceptors = getInterceptors();
            assertThat(interceptors).hasSize(1);
            return interceptors.getFirst();
        }
    }
}
