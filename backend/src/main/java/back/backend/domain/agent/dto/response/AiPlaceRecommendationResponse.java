package back.backend.domain.agent.dto.response;

import back.backend.domain.place.dto.response.PlaceSearchResponse;

public record AiPlaceRecommendationResponse(
        PlaceSearchResponse place,
        String reason,
        int routeDeviationMeters,
        double styleCompatibility
) {
}
