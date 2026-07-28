package back.backend.domain.itinerary.service;

import back.backend.domain.itinerary.entity.ItineraryItem;
import back.backend.domain.place.entity.TripPlace;
import org.springframework.stereotype.Component;

import java.util.Comparator;
import java.util.List;
import java.util.Map;

@Component
public class ItineraryTravelEstimator {

    private static final double EARTH_RADIUS_METERS = 6_371_000;
    private static final double AVERAGE_SPEED_KMH = 30.0;

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
                current.updateTravelInformation(null, null);
                continue;
            }

            int distanceMeters = (int) Math.round(
                    distanceMeters(currentPlace, nextPlace)
            );
            current.updateTravelInformation(
                    estimateTransportMinutes(distanceMeters),
                    distanceMeters
            );
        }
    }

    private int estimateTransportMinutes(int distanceMeters) {
        double minutes = distanceMeters / 1000.0 / AVERAGE_SPEED_KMH * 60.0;
        return Math.max(5, (int) Math.ceil(minutes / 5.0) * 5);
    }

    private double distanceMeters(TripPlace first, TripPlace second) {
        double latitude1 = Math.toRadians(
                first.getPlace().getLatitude().doubleValue()
        );
        double latitude2 = Math.toRadians(
                second.getPlace().getLatitude().doubleValue()
        );
        double latitudeDelta = latitude2 - latitude1;
        double longitudeDelta = Math.toRadians(
                second.getPlace().getLongitude().doubleValue()
                        - first.getPlace().getLongitude().doubleValue()
        );
        double haversine = Math.pow(Math.sin(latitudeDelta / 2), 2)
                + Math.cos(latitude1)
                * Math.cos(latitude2)
                * Math.pow(Math.sin(longitudeDelta / 2), 2);
        return EARTH_RADIUS_METERS * 2 * Math.atan2(
                Math.sqrt(haversine),
                Math.sqrt(1 - haversine)
        );
    }
}
