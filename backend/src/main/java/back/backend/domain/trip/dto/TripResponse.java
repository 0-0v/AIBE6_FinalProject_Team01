package back.backend.domain.trip.dto;

import back.backend.domain.trip.entity.CompanionType;
import back.backend.domain.trip.entity.TravelStyle;
import back.backend.domain.trip.entity.Trip;
import back.backend.domain.trip.entity.TripStatus;
import back.backend.domain.trip.entity.TripVisibility;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Set;

public record TripResponse(
        Long id,
        Long ownerId,
        String title,
        CompanionType companionType,
        Set<TravelStyle> travelStyles,
        String destination,
        Double destinationLat,
        Double destinationLng,
        LocalDate startDate,
        LocalDate endDate,
        String coverImageUrl,
        long memberCount,
        TripStatus status,
        TripVisibility visibility,
        boolean completionConfirmed,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        String dayStartTime,
        String dayEndTime,
        String travelPace,
        String destinationEnglishName,
        String destinationCountryCode
) {
    public TripResponse(
            Long id, Long ownerId, String title, CompanionType companionType,
            Set<TravelStyle> travelStyles, String destination, Double destinationLat,
            Double destinationLng, LocalDate startDate, LocalDate endDate,
            String coverImageUrl, long memberCount, TripStatus status,
            TripVisibility visibility, boolean completionConfirmed,
            LocalDateTime createdAt, LocalDateTime updatedAt, String dayStartTime,
            String dayEndTime, String travelPace
    ) {
        this(id, ownerId, title, companionType, travelStyles, destination,
                destinationLat, destinationLng, startDate, endDate, coverImageUrl,
                memberCount, status, visibility, completionConfirmed, createdAt,
                updatedAt, dayStartTime, dayEndTime, travelPace, null, null);
    }

    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm");

    public TripResponse(
            Long id,
            Long ownerId,
            String title,
            CompanionType companionType,
            Set<TravelStyle> travelStyles,
            String destination,
            LocalDate startDate,
            LocalDate endDate,
            String coverImageUrl,
            long memberCount,
            TripStatus status,
            TripVisibility visibility,
            boolean completionConfirmed,
            LocalDateTime createdAt,
            LocalDateTime updatedAt,
            String dayStartTime,
            String dayEndTime,
            String travelPace
    ) {
        this(id, ownerId, title, companionType, travelStyles, destination, null, null,
                startDate, endDate, coverImageUrl, memberCount, status, visibility,
                completionConfirmed, createdAt, updatedAt, dayStartTime, dayEndTime, travelPace,
                null, null);
    }

    public static TripResponse from(Trip trip, long memberCount) {
        return new TripResponse(
                trip.getId(), trip.getOwnerId(), trip.getTitle(), trip.getCompanionType(),
                trip.getTravelStyles(), trip.getDestination(), trip.getDestinationLat(), trip.getDestinationLng(), trip.getStartDate(), trip.getEndDate(),
                trip.getCoverImageUrl(), memberCount, trip.getStatus(), trip.getVisibility(),
                trip.isCompletionConfirmed(), trip.getCreatedAt(), trip.getUpdatedAt(),
                trip.getDayStartTime().format(TIME_FMT),
                trip.getDayEndTime().format(TIME_FMT),
                trip.getTravelPace().name(), trip.getDestinationEnglishName(),
                trip.getDestinationCountryCode());
    }
}
