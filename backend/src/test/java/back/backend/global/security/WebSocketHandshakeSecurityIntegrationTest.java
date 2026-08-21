package back.backend.global.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.WebSocket;
import java.util.Optional;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;
import back.backend.domain.member.entity.Member;
import back.backend.domain.member.entity.MemberStatus;
import back.backend.domain.member.repository.MemberRepository;
import back.backend.domain.trip.repository.TripMemberRepository;
import back.backend.global.realtime.RealtimeEvent;
import back.backend.global.realtime.RealtimeEventBroadcaster;
import back.backend.global.security.jwt.JwtProvider;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class WebSocketHandshakeSecurityIntegrationTest {

    @LocalServerPort int port;
    @MockitoBean MemberRepository memberRepository;
    @MockitoBean TripMemberRepository tripMemberRepository;
    @Autowired JwtProvider jwtProvider;
    @Autowired RealtimeEventBroadcaster realtimeEventBroadcaster;

    @Test
    @DisplayName("t1 인증 전 WebSocket HTTP 핸드셰이크를 Spring Security가 차단하지 않는다")
    void t1_webSocketHandshakeIsPublicBeforeStompAuthentication() throws Exception {
        WebSocket socket = HttpClient.newHttpClient()
                .newWebSocketBuilder()
                .buildAsync(
                        URI.create("ws://localhost:" + port + "/ws"),
                        new WebSocket.Listener() {
                            @Override
                            public CompletionStage<?> onClose(
                                    WebSocket webSocket, int statusCode, String reason) {
                                return null;
                            }
                        })
                .get(5, TimeUnit.SECONDS);

        assertThat(socket.isOutputClosed()).isFalse();
        socket.sendClose(WebSocket.NORMAL_CLOSURE, "test complete").get(5, TimeUnit.SECONDS);
    }

    @Test
    @DisplayName("t2 유효한 액세스 토큰으로 STOMP 연결을 인증한다")
    void t2_stompConnectAuthenticatesAccessToken() throws Exception {
        allowMember(99L);
        CompletableFuture<String> message = new CompletableFuture<>();
        WebSocket socket = HttpClient.newHttpClient()
                .newWebSocketBuilder()
                .subprotocols("v12.stomp")
                .buildAsync(
                        URI.create("ws://localhost:" + port + "/ws"),
                        new TextMessageListener(message))
                .get(5, TimeUnit.SECONDS);
        String token = jwtProvider.createAccessToken(99L, "websocket@test.local", 0L);

        socket.sendText(
                "CONNECT\naccept-version:1.2\nhost:localhost\nAuthorization:Bearer "
                        + token + "\n\n\0",
                true).get(5, TimeUnit.SECONDS);

        assertThat(message.get(5, TimeUnit.SECONDS)).startsWith("CONNECTED");
        socket.sendClose(WebSocket.NORMAL_CLOSURE, "test complete").get(5, TimeUnit.SECONDS);
    }

    @Test
    @DisplayName("t3 인증된 여행방 구독자에게 실시간 이벤트를 전달한다")
    void t3_tripSubscriberReceivesRealtimeEvent() throws Exception {
        allowMember(99L);
        when(tripMemberRepository.existsByTripIdAndMemberId(7L, 99L)).thenReturn(true);
        BlockingQueue<String> messages = new LinkedBlockingQueue<>();
        WebSocket socket = HttpClient.newHttpClient()
                .newWebSocketBuilder()
                .subprotocols("v12.stomp")
                .buildAsync(
                        URI.create("ws://localhost:" + port + "/ws"),
                        new QueueMessageListener(messages))
                .get(5, TimeUnit.SECONDS);
        String token = jwtProvider.createAccessToken(99L, "websocket@test.local", 0L);
        socket.sendText(
                "CONNECT\naccept-version:1.2\nhost:localhost\nAuthorization:Bearer "
                        + token + "\n\n\0",
                true).get(5, TimeUnit.SECONDS);
        assertThat(messages.poll(5, TimeUnit.SECONDS)).startsWith("CONNECTED");

        socket.sendText(
                "SUBSCRIBE\nid:trip-7\ndestination:/topic/trips/7\n\n\0",
                true).get(5, TimeUnit.SECONDS);
        verify(tripMemberRepository, timeout(5_000))
                .existsByTripIdAndMemberId(7L, 99L);

        realtimeEventBroadcaster.broadcast(RealtimeEvent.activity(7L, "TRIP_PLACE", 10L));

        String delivered = messages.poll(5, TimeUnit.SECONDS);
        assertThat(delivered).startsWith("MESSAGE");
        assertThat(delivered).contains("\"tripId\":7", "\"targetType\":\"TRIP_PLACE\"");
        socket.sendClose(WebSocket.NORMAL_CLOSURE, "test complete").get(5, TimeUnit.SECONDS);
    }

    private void allowMember(Long memberId) {
        Member member = mock(Member.class);
        when(member.getStatus()).thenReturn(MemberStatus.ACTIVE);
        when(member.getTokenVersion()).thenReturn(0L);
        when(memberRepository.findById(memberId)).thenReturn(Optional.of(member));
    }

    private static final class TextMessageListener implements WebSocket.Listener {
        private final CompletableFuture<String> message;
        private final StringBuilder payload = new StringBuilder();

        private TextMessageListener(CompletableFuture<String> message) {
            this.message = message;
        }

        @Override
        public void onOpen(WebSocket webSocket) {
            webSocket.request(1);
        }

        @Override
        public CompletionStage<?> onText(WebSocket webSocket, CharSequence data, boolean last) {
            payload.append(data);
            if (last) message.complete(payload.toString());
            webSocket.request(1);
            return null;
        }
    }

    private static final class QueueMessageListener implements WebSocket.Listener {
        private final BlockingQueue<String> messages;
        private final StringBuilder payload = new StringBuilder();

        private QueueMessageListener(BlockingQueue<String> messages) {
            this.messages = messages;
        }

        @Override
        public void onOpen(WebSocket webSocket) {
            webSocket.request(1);
        }

        @Override
        public CompletionStage<?> onText(WebSocket webSocket, CharSequence data, boolean last) {
            payload.append(data);
            if (last) {
                messages.add(payload.toString());
                payload.setLength(0);
            }
            webSocket.request(1);
            return null;
        }
    }
}
