package back.backend.global.security;

import back.backend.global.exception.CommonErrorCode;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import java.util.Set;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 5)
public class CookieOriginCsrfFilter extends OncePerRequestFilter {

    private static final Set<String> PROTECTED_PATHS = Set.of(
            "/api/auth/reissue",
            "/api/auth/logout"
    );
    private static final String FORBIDDEN_MESSAGE = "허용되지 않은 출처의 요청입니다.";

    private final Set<String> allowedOrigins;
    public CookieOriginCsrfFilter(
            @Value("${app.cors.allowed-origins:http://localhost:3000}") List<String> allowedOrigins
    ) {
        this.allowedOrigins = Set.copyOf(allowedOrigins);
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        if (!requiresOriginValidation(request)) {
            filterChain.doFilter(request, response);
            return;
        }

        String origin = request.getHeader(HttpHeaders.ORIGIN);
        if (!StringUtils.hasText(origin) || allowedOrigins.contains(origin)) {
            filterChain.doFilter(request, response);
            return;
        }

        CommonErrorCode errorCode = CommonErrorCode.FORBIDDEN;
        response.setStatus(errorCode.getStatus().value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding(java.nio.charset.StandardCharsets.UTF_8.name());
        response.getWriter().write("""
                {"status":403,"code":"COMMON_403","message":"%s","path":"%s","fieldErrors":[]}
                """.formatted(FORBIDDEN_MESSAGE, request.getRequestURI()).strip());
    }

    private boolean requiresOriginValidation(HttpServletRequest request) {
        return "POST".equals(request.getMethod())
                && PROTECTED_PATHS.contains(request.getRequestURI());
    }
}
