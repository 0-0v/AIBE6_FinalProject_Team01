package back.backend.domain.itinerary.dto.response;

public record RoutePlanOption(
        String routeLabel,
        RoutePlanPreviewResponse plan
) {}
