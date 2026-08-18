package back.backend.global.realtime;

import back.backend.global.security.CorsProperties;
import back.backend.global.security.jwt.JwtProvider;
import back.backend.global.security.jwt.TokenType;
import back.backend.domain.member.entity.MemberStatus;
import back.backend.domain.member.repository.MemberRepository;
import java.security.Principal;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final JwtProvider jwtProvider;
    private final MemberRepository memberRepository;
    private final CorsProperties corsProperties;
    private final TripSubscriptionAuthorizer tripSubscriptionAuthorizer;
    private final RevokedWebSocketMemberRegistry revokedMemberRegistry;

    public WebSocketConfig(
            JwtProvider jwtProvider,
            MemberRepository memberRepository,
            CorsProperties corsProperties,
            TripSubscriptionAuthorizer tripSubscriptionAuthorizer,
            RevokedWebSocketMemberRegistry revokedMemberRegistry
    ) {
        this.jwtProvider = jwtProvider;
        this.memberRepository = memberRepository;
        this.corsProperties = corsProperties;
        this.tripSubscriptionAuthorizer = tripSubscriptionAuthorizer;
        this.revokedMemberRegistry = revokedMemberRegistry;
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
                if (accessor.getCommand() == StompCommand.SUBSCRIBE
                        || accessor.getCommand() == StompCommand.SEND) {
                    authorizeActiveMember(accessor.getUser());
                    authorizeSubscription(accessor);
                }
                return MessageBuilder.createMessage(
                        message.getPayload(),
                        accessor.getMessageHeaders()
                );
            }
        });
    }

    private void authorizeSubscription(StompHeaderAccessor accessor) {
        tripSubscriptionAuthorizer.authorize(accessor.getDestination(), accessor.getUser());
    }

    private void authorizeActiveMember(Principal principal) {
        if (principal == null) {
            throw new IllegalArgumentException("WebSocket 인증 정보가 필요합니다.");
        }
        try {
            Long memberId = Long.valueOf(principal.getName());
            if (revokedMemberRegistry.isRevoked(memberId)) {
                throw new IllegalArgumentException("WebSocket 인증 정보가 만료되었습니다.");
            }
        } catch (NumberFormatException exception) {
            throw new IllegalArgumentException("유효하지 않은 WebSocket 사용자입니다.", exception);
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
        Long memberId = jwtProvider.getMemberId(token);
        long tokenVersion = jwtProvider.getTokenVersion(token);
        boolean authorized = memberRepository.findById(memberId)
                .filter(member -> member.getStatus() == MemberStatus.ACTIVE)
                .filter(member -> member.getTokenVersion() == tokenVersion)
                .isPresent();
        if (!authorized) {
            throw new IllegalArgumentException("WebSocket 인증 정보가 만료되었습니다.");
        }
        revokedMemberRegistry.allow(memberId);
        return () -> memberId.toString();
    }
}
