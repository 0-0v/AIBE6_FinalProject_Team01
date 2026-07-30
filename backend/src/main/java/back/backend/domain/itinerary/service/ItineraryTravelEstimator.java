package back.backend.domain.itinerary.service;

import back.backend.domain.itinerary.entity.ItineraryItem;
import back.backend.domain.itinerary.entity.ItineraryTransportMode;
import back.backend.domain.place.entity.TripPlace;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.time.Instant;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneId;

@Component
@RequiredArgsConstructor
public class ItineraryTravelEstimator {

    private final GoogleRoutesClient routesClient;

    public void recalculate(
            List<ItineraryItem> itineraryItems,
            Map<Long, TripPlace> tripPlaceById
    ) {
        List<ItineraryItem> orderedItems = itineraryItems.stream()
                .sorted(Comparator.comparingInt(ItineraryItem::getSortOrder))
                .toList();

        for (int index = 0; index < orderedItems.size(); index++) {
            ItineraryItem current = orderedItems.get(index);
            ItineraryItem next = index + 1 < orderedItems.size()
                    ? orderedItems.get(index + 1)
                    : null;
            TripPlace currentPlace = tripPlaceById.get(current.getTripPlaceId());
            TripPlace nextPlace = next == null
                    ? null
                    : tripPlaceById.get(next.getTripPlaceId());

            if (currentPlace == null || nextPlace == null) {
                current.updateTravelInformation(null, null, null);
                continue;
            }

            int distanceMeters = (int) Math.round(
                    GeoDistanceCalculator.distanceMeters(
                            currentPlace,
                            nextPlace
                    )
            );
            ItineraryTransportMode selectedMode =
                    current.isTransportModeManual()
                            ? selectedPreference(current)
                            : null;
            boolean preserveManualMode = selectedMode != null;
            calculateSegment(
                    current,
                    currentPlace,
                    nextPlace,
                    preserveManualMode
                            ? selectedMode
                            : ItineraryTransportMode.infer(distanceMeters),
                    preserveManualMode
            );
        }
    }

    public void recalculateSegment(
            ItineraryItem item,
            TripPlace currentPlace,
            TripPlace nextPlace,
            ItineraryTransportMode transportMode
    ) {
        calculateSegment(
                item,
                currentPlace,
                nextPlace,
                transportMode,
                true
        );
    }

    public void recalculateSegmentAutomatically(
            ItineraryItem item,
            TripPlace currentPlace,
            TripPlace nextPlace
    ) {
        int distanceMeters = (int) Math.round(
                GeoDistanceCalculator.distanceMeters(
                        currentPlace,
                        nextPlace
                )
        );
        calculateSegment(
                item,
                currentPlace,
                nextPlace,
                ItineraryTransportMode.infer(distanceMeters),
                false
        );
    }

    private void calculateSegment(
            ItineraryItem item,
            TripPlace currentPlace,
            TripPlace nextPlace,
            ItineraryTransportMode transportMode,
            boolean manual
    ) {
        var routeInfo = routesClient.getRouteInfo(
                currentPlace.getPlace().getLatitude().doubleValue(),
                currentPlace.getPlace().getLongitude().doubleValue(),
                nextPlace.getPlace().getLatitude().doubleValue(),
                nextPlace.getPlace().getLongitude().doubleValue(),
                transportMode.directionsMode(),
                transportMode.transitMode(),
                departureTime(item)
        );
        int fallbackDistance = (int) Math.round(
                GeoDistanceCalculator.distanceMeters(
                        currentPlace,
                        nextPlace
                )
        );
        int distanceMeters = routeInfo
                .map(GoogleRoutesClient.RouteInfo::distanceMeters)
                .orElse(fallbackDistance);
        int durationMinutes = routeInfo
                .map(GoogleRoutesClient.RouteInfo::durationMinutes)
                .orElseGet(() -> estimateTransportMinutes(
                        fallbackDistance,
                        transportMode.fallbackSpeedKmh()
                ));
        item.updateTravelInformation(
                durationMinutes,
                distanceMeters,
                resolvedModeLabel(
                        routeInfo.orElse(null),
                        transportMode,
                        manual
                ),
                routeInfo
                        .map(GoogleRoutesClient.RouteInfo::transportDetail)
                        .filter(detail -> !detail.isBlank())
                        .orElse(null),
                manual,
                manual ? transportMode.name() : null
        );
    }

    private ItineraryTransportMode selectedPreference(
            ItineraryItem item
    ) {
        if (item.getTransportModePreference() != null) {
            try {
                return ItineraryTransportMode.valueOf(
                        item.getTransportModePreference()
                );
            } catch (IllegalArgumentException ignored) {
                // 이전 데이터는 화면 표시값을 기준으로 복구한다.
            }
        }
        return ItineraryTransportMode.fromDisplayName(item.getTransportMode());
    }

    private String resolvedModeLabel(
            GoogleRoutesClient.RouteInfo routeInfo,
            ItineraryTransportMode requestedMode,
            boolean manual
    ) {
        if (requestedMode == ItineraryTransportMode.TAXI) {
            return requestedMode.displayName();
        }
        if (manual
                && routeInfo == null
                && "transit".equals(requestedMode.directionsMode())) {
            return "대중교통";
        }
        return routeInfo != null
                && routeInfo.actualTransportMode() != null
                ? routeInfo.actualTransportMode()
                : requestedMode.displayName();
    }

    private Instant departureTime(ItineraryItem item) {
        if (item.getEndTime() == null
                || item.getItineraryDay() == null
                || item.getItineraryDay().getItineraryDate() == null) {
            return null;
        }
        Instant departure = LocalDateTime.of(
                        item.getItineraryDay().getItineraryDate(),
                        item.getEndTime()
                )
                .atZone(ZoneId.systemDefault())
                .toInstant();
        Instant now = Instant.now();
        if (departure.isBefore(now.minus(Duration.ofDays(7)))
                || departure.isAfter(now.plus(Duration.ofDays(100)))) {
            return null;
        }
        return departure;
    }

    private int estimateTransportMinutes(
            int distanceMeters,
            double averageSpeedKmh
    ) {
        double minutes = distanceMeters / 1000.0 / averageSpeedKmh * 60.0;
        return Math.max(5, (int) Math.ceil(minutes / 5.0) * 5);
    }

}
