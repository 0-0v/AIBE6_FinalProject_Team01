package back.backend.global.util;

public final class GeoDistanceCalculator {

    private static final double EARTH_RADIUS_METERS = 6_371_000;

    private GeoDistanceCalculator() {
    }

    public static double distanceMeters(
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
        double normalizedHaversine = Math.max(0.0, Math.min(1.0, haversine));
        return EARTH_RADIUS_METERS * 2 * Math.atan2(
                Math.sqrt(normalizedHaversine),
                Math.sqrt(1 - normalizedHaversine)
        );
    }
}
