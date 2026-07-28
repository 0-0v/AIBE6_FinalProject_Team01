package back.backend.domain.itinerary.service;

import back.backend.domain.place.entity.TripPlace;

final class GeoDistanceCalculator {

    private static final double EARTH_RADIUS_METERS = 6_371_000;

    private GeoDistanceCalculator() {
    }

    static double distanceMeters(TripPlace first, TripPlace second) {
        return distanceMeters(
                first.getPlace().getLatitude().doubleValue(),
                first.getPlace().getLongitude().doubleValue(),
                second.getPlace().getLatitude().doubleValue(),
                second.getPlace().getLongitude().doubleValue()
        );
    }

    static double distanceMeters(
            double latitude1,
            double longitude1,
            double latitude2,
            double longitude2
    ) {
        double lat1 = Math.toRadians(latitude1);
        double lat2 = Math.toRadians(latitude2);
        double latitudeDelta = lat2 - lat1;
        double longitudeDelta = Math.toRadians(longitude2 - longitude1);
        double haversine = Math.pow(Math.sin(latitudeDelta / 2), 2)
                + Math.cos(lat1)
                * Math.cos(lat2)
                * Math.pow(Math.sin(longitudeDelta / 2), 2);
        return EARTH_RADIUS_METERS * 2 * Math.atan2(
                Math.sqrt(haversine),
                Math.sqrt(1 - haversine)
        );
    }
}
