package back.backend.domain.itinerary.dto.response;

import back.backend.domain.itinerary.entity.ItineraryItem;
import back.backend.domain.place.entity.TripPlace;

import java.time.format.DateTimeFormatter;

public record ItineraryItemResponse(
    Long id,
    Long tripPlaceId,
    String placeName,
    String placeAddress,
    String categoryName,
    String categoryColor,
    String categoryIcon,
    double lat,
    double lng,
    String startTime,
    String endTime,
    int sortOrder,
    Integer transportMinutes,
    Integer transportMeters,
    String memo
) {
    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm");

    public static ItineraryItemResponse from(ItineraryItem item, TripPlace tripPlace) {
        String placeName = tripPlace != null ? tripPlace.getPlace().getName() : null;
        String placeAddress = tripPlace != null ? tripPlace.getPlace().getAddress() : null;
        String catName = tripPlace != null ? tripPlace.getCategory().getName() : null;
        String catColor = tripPlace != null ? tripPlace.getCategory().getMarkerColor() : null;
        String catIcon = tripPlace != null ? tripPlace.getCategory().getMarkerIcon().name() : null;
        double lat = tripPlace != null ? tripPlace.getPlace().getLatitude().doubleValue() : 0;
        double lng = tripPlace != null ? tripPlace.getPlace().getLongitude().doubleValue() : 0;

        return new ItineraryItemResponse(
            item.getId(),
            item.getTripPlaceId(),
            placeName,
            placeAddress,
            catName,
            catColor,
            catIcon,
            lat,
            lng,
            item.getStartTime() != null ? item.getStartTime().format(TIME_FMT) : null,
            item.getEndTime() != null ? item.getEndTime().format(TIME_FMT) : null,
            item.getSortOrder(),
            item.getTransportMinutes(),
            item.getTransportMeters(),
            item.getMemo()
        );
    }
}
