package back.backend.domain.place.dto.response;

public record MapPinSummaryResponse(
        String googlePlaceId,
        Double lat,
        Double lng,
        String placeName,
        Long commentCount
) {}
