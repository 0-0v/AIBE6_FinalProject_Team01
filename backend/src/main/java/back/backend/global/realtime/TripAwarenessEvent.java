package back.backend.global.realtime;

import java.time.Instant;

public record TripAwarenessEvent(
        Long tripId,
        Long memberId,
        String workspace,
        Integer selectedDay,
        String selectedPlaceId,
        String selectedPlaceName,
        Double mapLat,
        Double mapLng,
        Double mapZoom,
        String editingType,
        String editingTargetId,
        String editingLabel,
        Instant occurredAt
) {

    public static TripAwarenessEvent from(
            Long tripId,
            Long memberId,
            TripAwarenessRequest request
    ) {
        return new TripAwarenessEvent(
                tripId,
                memberId,
                request.workspace(),
                request.selectedDay(),
                request.selectedPlaceId(),
                request.selectedPlaceName(),
                request.mapLat(),
                request.mapLng(),
                request.mapZoom(),
                request.editingType(),
                request.editingTargetId(),
                request.editingLabel(),
                Instant.now()
        );
    }
}
