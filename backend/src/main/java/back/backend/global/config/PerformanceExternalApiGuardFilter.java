package back.backend.global.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@Profile("performance")
@Order(Ordered.HIGHEST_PRECEDENCE)
public class PerformanceExternalApiGuardFilter extends OncePerRequestFilter {

    private static final List<String> BLOCKED_PATHS = List.of(
            "/api/places/search",
            "/api/places/photo/**",
            "/api/places/details",
            "/api/places/destination-metadata",
            "/api/trips/*/ai/**",
            "/api/trips/*/itinerary/replan/**",
            "/api/trips/*/itinerary/route-plan/**",
            "/api/trips/*/email-invitations/**",
            "/api/auth/email-verifications/**",
            "/api/admin/inquiries/*/reply"
    );

    private final AntPathMatcher pathMatcher = new AntPathMatcher();
    private final boolean allowExternalApis;

    public PerformanceExternalApiGuardFilter(
            @Value("${app.performance.allow-external-apis:false}") boolean allowExternalApis
    ) {
        this.allowExternalApis = allowExternalApis;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        if (!allowExternalApis && isBlocked(request.getRequestURI())) {
            response.setStatus(HttpServletResponse.SC_SERVICE_UNAVAILABLE);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setCharacterEncoding("UTF-8");
            response.getWriter().write("{\"message\":\"성능 테스트에서는 외부 API 호출이 차단됩니다.\"}");
            return;
        }
        filterChain.doFilter(request, response);
    }

    private boolean isBlocked(String requestUri) {
        return BLOCKED_PATHS.stream().anyMatch(pattern -> pathMatcher.match(pattern, requestUri));
    }
}
