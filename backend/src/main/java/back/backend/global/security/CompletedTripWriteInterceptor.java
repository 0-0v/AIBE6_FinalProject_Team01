package back.backend.global.security;

import back.backend.domain.trip.entity.TripStatus;
import back.backend.domain.trip.exception.TripErrorCode;
import back.backend.domain.trip.repository.TripRepository;
import back.backend.global.exception.BusinessException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Map;
import java.util.Set;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.HandlerMapping;

public class CompletedTripWriteInterceptor implements HandlerInterceptor {

    private static final Set<String> BLOCKED_FEATURES = Set.of(
            "places", "categories", "map-pins", "itinerary", "expenses",
            "ai", "date-availability", "date-proposal"
    );

    private final TripRepository tripRepository;

    public CompletedTripWriteInterceptor(TripRepository tripRepository) {
        this.tripRepository = tripRepository;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if ("GET".equals(request.getMethod()) || !targetsBlockedFeature(request)) {
            return true;
        }
        Long tripId = tripId(request);
        if (tripId == null) {
            return true;
        }
        tripRepository.findById(tripId)
                .filter(trip -> trip.getStatus() == TripStatus.COMPLETED)
                .ifPresent(trip -> {
                    throw new BusinessException(TripErrorCode.TRIP_ALREADY_FINISHED);
                });
        return true;
    }

    private boolean targetsBlockedFeature(HttpServletRequest request) {
        String prefix = "/api/trips/" + tripIdText(request) + "/";
        if (!request.getRequestURI().startsWith(prefix)) {
            return false;
        }
        String remainder = request.getRequestURI().substring(prefix.length());
        String feature = remainder.split("/", 2)[0];
        return BLOCKED_FEATURES.contains(feature);
    }

    private Long tripId(HttpServletRequest request) {
        String value = tripIdText(request);
        try {
            return value == null ? null : Long.valueOf(value);
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    private String tripIdText(HttpServletRequest request) {
        Object value = request.getAttribute(HandlerMapping.URI_TEMPLATE_VARIABLES_ATTRIBUTE);
        if (value instanceof Map<?, ?> variables) {
            Object tripId = variables.get("tripId");
            return tripId instanceof String stringValue ? stringValue : null;
        }
        return null;
    }
}
