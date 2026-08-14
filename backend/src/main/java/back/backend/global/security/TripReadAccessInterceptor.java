package back.backend.global.security;

import back.backend.domain.place.service.TripAccessChecker;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Map;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.HandlerMapping;

public class TripReadAccessInterceptor implements HandlerInterceptor {

    private static final String TRIP_ID_VARIABLE = "tripId";

    private final TripAccessChecker accessChecker;

    public TripReadAccessInterceptor(TripAccessChecker accessChecker) {
        this.accessChecker = accessChecker;
    }

    @Override
    public boolean preHandle(
            HttpServletRequest request,
            HttpServletResponse response,
            Object handler
    ) {
        if (!"GET".equals(request.getMethod())) {
            return true;
        }

        String tripId = tripId(request);
        if (tripId == null) {
            return true;
        }

        try {
            accessChecker.requireView(Long.valueOf(tripId));
        } catch (NumberFormatException ignored) {
            // MVC가 기존 방식대로 잘못된 경로 변수에 대한 400 응답을 처리하도록 넘긴다.
        }
        return true;
    }

    private String tripId(HttpServletRequest request) {
        Object value = request.getAttribute(HandlerMapping.URI_TEMPLATE_VARIABLES_ATTRIBUTE);
        if (value instanceof Map<?, ?> variables) {
            Object tripId = variables.get(TRIP_ID_VARIABLE);
            return tripId instanceof String stringValue ? stringValue : null;
        }
        return null;
    }
}
