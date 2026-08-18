package back.backend.domain.auth.service;

import back.backend.domain.auth.config.LoginAttemptProperties;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

@Component
public class ClientIpResolver {
    private static final String FORWARDED_FOR = "X-Forwarded-For";

    private final Set<String> trustedProxies;

    public ClientIpResolver(LoginAttemptProperties properties) {
        this.trustedProxies = properties.getTrustedProxies().stream()
                .map(String::strip)
                .filter(value -> !value.isEmpty())
                .collect(Collectors.toUnmodifiableSet());
    }

    public String resolve(HttpServletRequest request) {
        String remoteAddress = request.getRemoteAddr();
        if (!trustedProxies.contains(remoteAddress)) {
            return remoteAddress;
        }
        String forwardedFor = request.getHeader(FORWARDED_FOR);
        if (forwardedFor == null || forwardedFor.isBlank()) {
            return remoteAddress;
        }
        String candidate = forwardedFor.split(",", 2)[0].strip();
        return candidate.isEmpty() ? remoteAddress : candidate;
    }
}
