package back.backend.domain.itinerary.service;

import back.backend.domain.itinerary.dto.response.RoutePlanDayResponse;
import back.backend.domain.itinerary.dto.response.RoutePlanItemResponse;
import back.backend.domain.itinerary.dto.response.RoutePlanPreviewResponse;
import back.backend.domain.itinerary.entity.ItineraryDay;
import back.backend.domain.itinerary.entity.ItineraryItem;
import back.backend.domain.itinerary.exception.ItineraryErrorCode;
import back.backend.domain.place.entity.TripPlace;
import back.backend.global.exception.BusinessException;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

final class ItineraryRequestValidator {

    private static final DateTimeFormatter TIME_FORMATTER =
            DateTimeFormatter.ofPattern("HH:mm");

    private ItineraryRequestValidator() {
    }

    static LocalTime parseTime(String value) {
        if (value == null) {
            return null;
        }
        try {
            return LocalTime.parse(value, TIME_FORMATTER);
        } catch (DateTimeParseException exception) {
            throw new BusinessException(ItineraryErrorCode.ITINERARY_INVALID_TIME);
        }
    }

    static void validateReorder(
            List<ItineraryItem> dayItems,
            List<Long> requestedIds
    ) {
        Set<Long> existingIds = dayItems.stream()
                .map(ItineraryItem::getId)
                .collect(Collectors.toSet());
        Set<Long> uniqueRequestedIds = new HashSet<>(requestedIds);
        if (requestedIds.size() != dayItems.size()
                || uniqueRequestedIds.size() != requestedIds.size()
                || !existingIds.equals(uniqueRequestedIds)) {
            throw new BusinessException(
                    ItineraryErrorCode.ITINERARY_INVALID_ITEM_ORDER
            );
        }
    }

    static void validateRoutePlan(
            RoutePlanPreviewResponse plan,
            List<ItineraryDay> days,
            List<TripPlace> savedPlaces
    ) {
        if (plan == null
                || plan.days() == null
                || plan.days().stream().anyMatch(Objects::isNull)) {
            throw invalidRoutePlan();
        }

        Set<Long> validDayIds = days.stream()
                .map(ItineraryDay::getId)
                .collect(Collectors.toSet());
        Set<Long> requestedDayIds = plan.days().stream()
                .map(RoutePlanDayResponse::dayId)
                .collect(Collectors.toSet());
        if (requestedDayIds.size() != plan.days().size()
                || !validDayIds.containsAll(requestedDayIds)
                || plan.days().stream().anyMatch(day ->
                day.dayId() == null
                        || day.items() == null
                        || day.items().stream().anyMatch(Objects::isNull))) {
            throw invalidRoutePlan();
        }

        List<RoutePlanItemResponse> plannedItems = plan.days().stream()
                .flatMap(day -> day.items().stream())
                .toList();
        Set<Long> savedPlaceIds = savedPlaces.stream()
                .map(TripPlace::getId)
                .collect(Collectors.toSet());
        Set<Long> plannedPlaceIds = plannedItems.stream()
                .map(RoutePlanItemResponse::tripPlaceId)
                .collect(Collectors.toSet());
        if (plannedPlaceIds.size() != plannedItems.size()
                || !savedPlaceIds.equals(plannedPlaceIds)
                || plannedItems.stream().anyMatch(item ->
                (item.transportMinutes() != null && item.transportMinutes() < 0)
                        || (item.transportMeters() != null && item.transportMeters() < 0))) {
            throw invalidRoutePlan();
        }

        for (RoutePlanItemResponse item : plannedItems) {
            LocalTime startTime = parseTime(item.startTime());
            LocalTime endTime = parseTime(item.endTime());
            if (startTime != null
                    && endTime != null
                    && endTime.isBefore(startTime)) {
                throw invalidRoutePlan();
            }
        }
    }

    private static BusinessException invalidRoutePlan() {
        return new BusinessException(
                ItineraryErrorCode.ITINERARY_INVALID_ROUTE_PLAN
        );
    }
}
