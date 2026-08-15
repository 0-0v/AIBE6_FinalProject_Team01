package back.backend.domain.itinerary.service;

import back.backend.domain.itinerary.entity.ItineraryDay;
import back.backend.domain.itinerary.entity.ItineraryItem;
import back.backend.domain.itinerary.entity.ItineraryTransportMode;
import back.backend.domain.place.entity.TripPlace;
import back.backend.domain.place.service.GooglePlaceContentRefreshService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.time.Instant;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneId;

@Component
@RequiredArgsConstructor
public class ItineraryTravelEstimator {

    private final GoogleRoutesClient routesClient;
    private final GooglePlaceContentRefreshService googlePlaceContentRefreshService;

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

    /**
     * 지정된 인덱스의 구간만 선택적으로 재계산합니다.
     * 장소 추가/삭제/이동 시 변경된 구간만 계산해 Routes API 호출을 최소화합니다.
     */
    public void recalculateAt(
            List<ItineraryItem> items,
            Map<Long, TripPlace> tripPlaceById,
            Set<Integer> indices
    ) {
        if (indices.isEmpty()) return;
        List<ItineraryItem> ordered = items.stream()
                .sorted(Comparator.comparingInt(ItineraryItem::getSortOrder))
                .toList();
        for (int index : indices) {
            if (index < 0 || index >= ordered.size()) continue;
            ItineraryItem current = ordered.get(index);
            ItineraryItem next = index + 1 < ordered.size() ? ordered.get(index + 1) : null;
            TripPlace currentPlace = tripPlaceById.get(current.getTripPlaceId());
            TripPlace nextPlace = next == null ? null : tripPlaceById.get(next.getTripPlaceId());
            if (currentPlace == null || nextPlace == null) {
                current.updateTravelInformation(null, null, null);
                continue;
            }
            int distanceMeters = (int) Math.round(
                    GeoDistanceCalculator.distanceMeters(currentPlace, nextPlace));
            ItineraryTransportMode selectedMode = current.isTransportModeManual()
                    ? selectedPreference(current) : null;
            boolean preserveManualMode = selectedMode != null;
            calculateSegment(
                    current,
                    currentPlace,
                    nextPlace,
                    preserveManualMode ? selectedMode : ItineraryTransportMode.infer(distanceMeters),
                    preserveManualMode
            );
        }
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
        if (!googlePlaceContentRefreshService.ensureFresh(currentPlace.getPlace())
                || !googlePlaceContentRefreshService.ensureFresh(nextPlace.getPlace())) {
            item.updateTravelInformation(null, null, null);
            return;
        }
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
        ItineraryTransportMode fallbackMode = fallbackMode(transportMode, manual);
        int durationMinutes = routeInfo
                .map(GoogleRoutesClient.RouteInfo::durationMinutes)
                .orElseGet(() -> estimateTransportMinutes(
                        fallbackDistance,
                        fallbackMode.fallbackSpeedKmh()
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

    /**
     * 출발지 → 첫 번째 아이템 구간을 계산해 ItineraryDay에 저장합니다.
     * 아이템이 없거나 출발지가 없으면 travel 정보를 null로 초기화합니다.
     */
    public void recalculateDeparture(
            ItineraryDay day,
            List<ItineraryItem> orderedItems,
            Map<Long, TripPlace> tripPlaceById
    ) {
        if (!day.hasDeparture() || orderedItems.isEmpty()) {
            day.updateDepartureTravelInfo(null, null, null);
            return;
        }

        ItineraryItem firstItem = orderedItems.stream()
                .min(Comparator.comparingInt(ItineraryItem::getSortOrder))
                .orElse(null);
        if (firstItem == null) {
            day.updateDepartureTravelInfo(null, null, null);
            return;
        }

        TripPlace firstPlace = tripPlaceById.get(firstItem.getTripPlaceId());
        if (firstPlace == null) {
            day.updateDepartureTravelInfo(null, null, null);
            return;
        }

        if (!googlePlaceContentRefreshService.ensureFresh(firstPlace.getPlace())) {
            day.updateDepartureTravelInfo(null, null, null);
            return;
        }

        double depLat = day.getDepartureLat().doubleValue();
        double depLng = day.getDepartureLng().doubleValue();
        double destLat = firstPlace.getPlace().getLatitude().doubleValue();
        double destLng = firstPlace.getPlace().getLongitude().doubleValue();

        int distanceMeters = (int) Math.round(
                GeoDistanceCalculator.distanceMeters(depLat, depLng, destLat, destLng)
        );
        ItineraryTransportMode mode = ItineraryTransportMode.infer(distanceMeters);

        var routeInfo = routesClient.getRouteInfo(
                depLat, depLng, destLat, destLng,
                mode.directionsMode(), mode.transitMode(), null
        );

        int travelMinutes = routeInfo
                .map(GoogleRoutesClient.RouteInfo::durationMinutes)
                .orElseGet(() -> estimateTransportMinutes(
                        distanceMeters,
                        fallbackMode(mode, false).fallbackSpeedKmh()
                ));
        int travelMeters = routeInfo
                .map(GoogleRoutesClient.RouteInfo::distanceMeters)
                .orElse(distanceMeters);
        String travelMode = routeInfo
                .map(GoogleRoutesClient.RouteInfo::actualTransportMode)
                .orElse(fallbackMode(mode, false).displayName());

        day.updateDepartureTravelInfo(travelMinutes, travelMeters, travelMode);
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
                : fallbackMode(requestedMode, manual).displayName();
    }

    private ItineraryTransportMode fallbackMode(
            ItineraryTransportMode requestedMode,
            boolean manual
    ) {
        if (!manual && requestedMode == ItineraryTransportMode.TRANSIT) {
            return ItineraryTransportMode.DRIVING;
        }
        return requestedMode;
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
