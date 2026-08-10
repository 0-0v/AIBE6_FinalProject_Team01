package back.backend.domain.itinerary.service;

import back.backend.domain.place.entity.TripPlace;

final class GeoDistanceCalculator {

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
        return back.backend.global.util.GeoDistanceCalculator.distanceMeters(
                latitude1,
                longitude1,
                latitude2,
                longitude2
        );
    }
}
