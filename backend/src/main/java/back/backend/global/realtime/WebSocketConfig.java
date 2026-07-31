package back.backend.global.realtime;

import back.backend.global.security.CorsProperties;
import back.backend.global.security.jwt.JwtProvider;
import back.backend.global.security.jwt.TokenType;
import back.backend.domain.trip.repository.TripMemberRepository;
import java.security.Principal;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final JwtProvider jwtProvider;
    private final CorsProperties corsProperties;
    private final TripMemberRepository tripMemberRepository;

    public WebSocketConfig(
            JwtProvider jwtProvider,
            CorsProperties corsProperties,
            TripMemberRepository tripMemberRepository
    ) {
        this.jwtProvider = jwtProvider;
        this.corsProperties = corsProperties;
        this.tripMemberRepository = tripMemberRepository;
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOrigins(corsProperties.getAllowedOrigins().toArray(String[]::new));
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic", "/queue");
        registry.setApplicationDestinationPrefixes("/app");
        registry.setUserDestinationPrefix("/user");
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor = StompHeaderAccessor.wrap(message);
                if (accessor.getCommand() == StompCommand.CONNECT) {
                    accessor.setUser(authenticate(accessor.getFirstNativeHeader("Authorization")));
                }
                if (accessor.getCommand() == StompCommand.SUBSCRIBE) {
                    authorizeSubscription(accessor);
                }
                return message;
            }
        });
    }

    private void authorizeSubscription(StompHeaderAccessor accessor) {
        String destination = accessor.getDestination();
        Principal user = accessor.getUser();
        if (destination == null || user == null || !destination.startsWith("/topic/trips/")) {
            return;
        }
        try {
            Long tripId = Long.valueOf(destination.substring("/topic/trips/".length()));
            Long memberId = Long.valueOf(user.getName());
            if (!tripMemberRepository.existsByTripIdAndMemberId(tripId, memberId)) {
                throw new IllegalArgumentException("여행방 실시간 채널에 접근할 권한이 없습니다.");
            }
        } catch (NumberFormatException exception) {
            throw new IllegalArgumentException("잘못된 여행방 실시간 채널입니다.", exception);
        }
    }

    private Principal authenticate(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            throw new IllegalArgumentException("WebSocket 인증 토큰이 필요합니다.");
        }
        String token = authorization.substring(7);
        if (!jwtProvider.isValid(token) || jwtProvider.getTokenType(token) != TokenType.ACCESS) {
            throw new IllegalArgumentException("유효하지 않은 WebSocket 인증 토큰입니다.");
        }
        String memberId = jwtProvider.getMemberId(token).toString();
        return () -> memberId;
    }
}
