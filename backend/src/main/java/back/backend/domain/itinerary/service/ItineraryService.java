package back.backend.domain.itinerary.service;

import back.backend.domain.itinerary.dto.request.*;
import back.backend.domain.itinerary.dto.response.ItineraryDayResponse;
import back.backend.domain.itinerary.dto.response.ItineraryItemResponse;
import back.backend.domain.itinerary.dto.response.RoutePlanDayResponse;
import back.backend.domain.itinerary.dto.response.RoutePlanItemResponse;
import back.backend.domain.itinerary.dto.response.RoutePlanPreviewResponse;
import back.backend.domain.itinerary.entity.*;
import back.backend.domain.itinerary.exception.ItineraryErrorCode;
import back.backend.domain.itinerary.repository.ItineraryDayRepository;
import back.backend.domain.itinerary.repository.ItineraryItemRepository;
import back.backend.domain.place.entity.TripPlace;
import back.backend.domain.place.entity.TripPlaceStatus;
import back.backend.domain.place.repository.TripPlaceRepository;
import back.backend.domain.place.service.TripAccessChecker;
import back.backend.domain.trip.repository.TripRepository;
import back.backend.global.exception.BusinessException;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeParseException;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ItineraryService {

    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm");

    private final ItineraryDayRepository dayRepository;
    private final ItineraryItemRepository itemRepository;
    private final TripPlaceRepository tripPlaceRepository;
    private final TripRepository tripRepository;
    private final TripAccessChecker accessChecker;
    private final ItineraryRoutePlanner routePlanner;
    private final ItineraryTravelEstimator travelEstimator;
    private final EntityManager entityManager;

    @Transactional(readOnly = true)
    public List<ItineraryDayResponse> getItinerary(Long tripId) {
        accessChecker.requireView(tripId);
        return buildDayResponses(tripId);
    }

    @Transactional
    public List<ItineraryDayResponse> initializeItinerary(Long tripId) {
        accessChecker.requireEdit(tripId);
        synchronizeItineraryDays(tripId);
        return buildDayResponses(tripId);
    }

    @Transactional
    public ItineraryDayResponse addItem(Long tripId, Long dayId, AddItineraryItemRequest request) {
        accessChecker.requireEdit(tripId);

        ItineraryDay day = findDayOrThrow(dayId, tripId);

        TripPlace tripPlace = tripPlaceRepository.findByIdAndTripId(request.tripPlaceId(), tripId)
                .orElseThrow(() -> new BusinessException(ItineraryErrorCode.ITINERARY_ITEM_NOT_FOUND));

        if (tripPlace.getStatus() != TripPlaceStatus.SAVED) {
            throw new BusinessException(ItineraryErrorCode.ITINERARY_PLACE_NOT_SAVED);
        }
        if (itemRepository.existsByItineraryDayTripIdAndTripPlaceId(
                tripId,
                request.tripPlaceId()
        )) {
            throw new BusinessException(ItineraryErrorCode.ITINERARY_ITEM_ALREADY_EXISTS);
        }
        if (itemRepository.existsByItineraryDayAndSortOrder(day, request.sortOrder())) {
            throw new BusinessException(ItineraryErrorCode.ITINERARY_SORT_ORDER_CONFLICT);
        }

        ItineraryItem item = ItineraryItem.create(day, request.tripPlaceId(), request.sortOrder());
        itemRepository.save(item);
        recalculateDay(day);

        return getDayResponseById(tripId, dayId);
    }

    @Transactional
    public void removeItem(Long tripId, Long itemId) {
        accessChecker.requireEdit(tripId);
        ItineraryItem item = findItemOrThrow(itemId, tripId);
        ItineraryDay day = item.getItineraryDay();
        itemRepository.delete(item);
        itemRepository.flush();
        recalculateDay(day);
    }

    @Transactional
    public ItineraryItemResponse updateItem(Long tripId, Long itemId, UpdateItineraryItemRequest request) {
        accessChecker.requireEdit(tripId);
        ItineraryItem item = findItemOrThrow(itemId, tripId);

        LocalTime startTime = parseTime(request.startTime());
        LocalTime endTime = parseTime(request.endTime());
        if (startTime != null && endTime != null && endTime.isBefore(startTime)) {
            throw new BusinessException(ItineraryErrorCode.ITINERARY_INVALID_TIME_RANGE);
        }
        item.updateDetails(
                startTime,
                endTime,
                request.memo(),
                request.transportMinutes() != null
                        ? request.transportMinutes()
                        : item.getTransportMinutes(),
                request.transportMeters() != null
                        ? request.transportMeters()
                        : item.getTransportMeters()
        );

        TripPlace tp = item.getTripPlaceId() != null
                ? tripPlaceRepository.findByIdAndTripId(item.getTripPlaceId(), tripId).orElse(null)
                : null;
        return ItineraryItemResponse.from(item, tp);
    }

    @Transactional
    public ItineraryItemResponse moveItem(Long tripId, Long itemId, MoveItineraryItemRequest request) {
        accessChecker.requireEdit(tripId);
        ItineraryItem item = findItemOrThrow(itemId, tripId);
        ItineraryDay sourceDay = item.getItineraryDay();
        ItineraryDay targetDay = findDayOrThrow(request.targetDayId(), tripId);

        if (item.getTripPlaceId() != null && itemRepository.existsByItineraryDayAndTripPlaceIdAndIdNot(
                targetDay,
                item.getTripPlaceId(),
                item.getId()
        )) {
            throw new BusinessException(ItineraryErrorCode.ITINERARY_ITEM_ALREADY_EXISTS);
        }

        List<ItineraryItem> sourceItems =
                new ArrayList<>(itemRepository.findAllByItineraryDayOrderBySortOrderAsc(sourceDay));
        List<ItineraryItem> targetItems = sourceDay.getId().equals(targetDay.getId())
                ? sourceItems
                : new ArrayList<>(
                        itemRepository.findAllByItineraryDayOrderBySortOrderAsc(targetDay)
                );
        sourceItems.removeIf(candidate -> candidate.getId().equals(item.getId()));
        if (sourceDay.getId().equals(targetDay.getId())) {
            targetItems = sourceItems;
        }
        if (request.sortOrder() > targetItems.size()) {
            throw new BusinessException(ItineraryErrorCode.ITINERARY_INVALID_ITEM_ORDER);
        }

        item.updateDay(targetDay);
        targetItems.add(request.sortOrder(), item);
        updateSortOrders(sourceItems);
        updateSortOrders(targetItems);
        if (!sourceItems.isEmpty() && !sourceDay.getId().equals(targetDay.getId())) {
            itemRepository.saveAllAndFlush(sourceItems);
        }
        itemRepository.saveAllAndFlush(targetItems);

        recalculateItems(sourceItems);
        if (!sourceDay.getId().equals(targetDay.getId())) {
            recalculateItems(targetItems);
        }

        TripPlace tp = item.getTripPlaceId() != null
                ? tripPlaceRepository.findByIdAndTripId(item.getTripPlaceId(), tripId).orElse(null)
                : null;
        return ItineraryItemResponse.from(item, tp);
    }

    @Transactional
    public ItineraryDayResponse reorderItems(Long tripId, Long dayId, ReorderItineraryItemsRequest request) {
        accessChecker.requireEdit(tripId);
        ItineraryDay day = findDayOrThrow(dayId, tripId);
        List<ItineraryItem> dayItems =
                itemRepository.findAllByItineraryDayOrderBySortOrderAsc(day);
        List<Long> requestedIds = request.itemIds();
        validateReorderRequest(dayItems, requestedIds);

        Map<Long, ItineraryItem> itemById = dayItems.stream()
                .collect(Collectors.toMap(ItineraryItem::getId, item -> item));
        List<ItineraryItem> reorderedItems = requestedIds.stream()
                .map(itemById::get)
                .toList();

        for (int i = 0; i < reorderedItems.size(); i++) {
            reorderedItems.get(i).updateSortOrder(-(i + 1));
        }
        itemRepository.saveAllAndFlush(reorderedItems);

        for (int i = 0; i < reorderedItems.size(); i++) {
            reorderedItems.get(i).updateSortOrder(i);
        }
        itemRepository.saveAllAndFlush(reorderedItems);
        recalculateItems(reorderedItems);

        return getDayResponseById(tripId, dayId);
    }

    @Transactional
    public ItineraryDayResponse updateDayStatus(Long tripId, Long dayId, UpdateItineraryDayStatusRequest request) {
        accessChecker.requireEdit(tripId);
        ItineraryDay day = findDayOrThrow(dayId, tripId);

        day.updateStatus(request.status());

        return getDayResponseById(tripId, dayId);
    }

    @Transactional(readOnly = true)
    public RoutePlanPreviewResponse previewRoutePlan(Long tripId) {
        accessChecker.requireView(tripId);
        return createRoutePlan(tripId);
    }

    @Transactional
    public List<ItineraryDayResponse> applyRoutePlan(
            Long tripId,
            RoutePlanPreviewResponse plan
    ) {
        accessChecker.requireEdit(tripId);
        synchronizeItineraryDays(tripId);

        List<ItineraryDay> days = dayRepository.findAllWithItemsByTripId(tripId);
        validateRoutePlan(plan, days, findSavedTripPlaces(tripId));
        Map<Long, ItineraryDay> dayById = days.stream()
                .collect(Collectors.toMap(ItineraryDay::getId, day -> day));
        List<ItineraryItem> existingItems = days.stream()
                .flatMap(day -> day.getItems().stream())
                .toList();
        Map<Long, ItineraryItem> itemByTripPlaceId = existingItems.stream()
                .filter(item -> item.getTripPlaceId() != null)
                .collect(Collectors.toMap(
                        ItineraryItem::getTripPlaceId,
                        item -> item
                ));
        Set<Long> plannedTripPlaceIds = plan.days().stream()
                .flatMap(day -> day.items().stream())
                .map(item -> item.tripPlaceId())
                .collect(Collectors.toSet());
        List<ItineraryItem> obsoleteItems = existingItems.stream()
                .filter(item -> !plannedTripPlaceIds.contains(item.getTripPlaceId()))
                .toList();
        if (!obsoleteItems.isEmpty()) {
            itemRepository.deleteAll(obsoleteItems);
            itemRepository.flush();
        }

        List<ItineraryItem> retainedItems = existingItems.stream()
                .filter(item -> plannedTripPlaceIds.contains(item.getTripPlaceId()))
                .toList();
        for (int index = 0; index < retainedItems.size(); index++) {
            retainedItems.get(index).updateSortOrder(-(index + 1));
        }
        if (!retainedItems.isEmpty()) {
            itemRepository.saveAllAndFlush(retainedItems);
        }

        List<ItineraryItem> plannedItems = new ArrayList<>();
        for (var plannedDay : plan.days()) {
            ItineraryDay day = dayById.get(plannedDay.dayId());
            if (day == null) continue;
            for (int index = 0; index < plannedDay.items().size(); index++) {
                var plannedItem = plannedDay.items().get(index);
                ItineraryItem item = itemByTripPlaceId.get(plannedItem.tripPlaceId());
                if (item == null) {
                    item = ItineraryItem.create(day, plannedItem.tripPlaceId(), index);
                } else {
                    item.updateDay(day);
                    item.updateSortOrder(index);
                }
                item.updateDetails(
                        parseTime(plannedItem.startTime()),
                        parseTime(plannedItem.endTime()),
                        item.getMemo(),
                        plannedItem.transportMinutes(),
                        plannedItem.transportMeters()
                );
                plannedItems.add(item);
            }
        }
        if (!plannedItems.isEmpty()) {
            itemRepository.saveAllAndFlush(plannedItems);
        }
        entityManager.clear();
        return buildDayResponses(tripId);
    }

    // ── private helpers ──────────────────────────────────────

    private ItineraryDay findDayOrThrow(Long dayId, Long tripId) {
        return dayRepository.findByIdAndTripId(dayId, tripId)
                .orElseThrow(() -> new BusinessException(ItineraryErrorCode.ITINERARY_DAY_NOT_FOUND));
    }

    private ItineraryItem findItemOrThrow(Long itemId, Long tripId) {
        return itemRepository.findByIdAndTripId(itemId, tripId)
                .orElseThrow(() -> new BusinessException(ItineraryErrorCode.ITINERARY_ITEM_NOT_FOUND));
    }

    private ItineraryDayResponse getDayResponseById(Long tripId, Long dayId) {
        return buildDayResponses(tripId).stream()
                .filter(d -> d.id().equals(dayId))
                .findFirst()
                .orElseThrow(() ->
                        new BusinessException(ItineraryErrorCode.ITINERARY_DAY_NOT_FOUND));
    }

    private LocalTime parseTime(String value) {
        if (value == null) {
            return null;
        }
        try {
            return LocalTime.parse(value, TIME_FMT);
        } catch (DateTimeParseException exception) {
            throw new BusinessException(ItineraryErrorCode.ITINERARY_INVALID_TIME);
        }
    }

    private void validateReorderRequest(
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
            throw new BusinessException(ItineraryErrorCode.ITINERARY_INVALID_ITEM_ORDER);
        }
    }

    private void validateRoutePlan(
            RoutePlanPreviewResponse plan,
            List<ItineraryDay> days,
            List<TripPlace> savedPlaces
    ) {
        if (plan == null
                || plan.days() == null
                || plan.days().stream().anyMatch(Objects::isNull)) {
            throw new BusinessException(ItineraryErrorCode.ITINERARY_INVALID_ROUTE_PLAN);
        }

        Set<Long> validDayIds = days.stream()
                .map(ItineraryDay::getId)
                .collect(Collectors.toSet());
        Set<Long> requestedDayIds = plan.days().stream()
                .map(RoutePlanDayResponse::dayId)
                .collect(Collectors.toSet());
        if (requestedDayIds.size() != plan.days().size()
                || !validDayIds.containsAll(requestedDayIds)) {
            throw new BusinessException(ItineraryErrorCode.ITINERARY_INVALID_ROUTE_PLAN);
        }

        if (plan.days().stream().anyMatch(day ->
                day.dayId() == null
                        || day.items() == null
                        || day.items().stream().anyMatch(Objects::isNull))) {
            throw new BusinessException(ItineraryErrorCode.ITINERARY_INVALID_ROUTE_PLAN);
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
            throw new BusinessException(ItineraryErrorCode.ITINERARY_INVALID_ROUTE_PLAN);
        }

        for (RoutePlanItemResponse item : plannedItems) {
            LocalTime startTime = parseTime(item.startTime());
            LocalTime endTime = parseTime(item.endTime());
            if (startTime != null && endTime != null && endTime.isBefore(startTime)) {
                throw new BusinessException(ItineraryErrorCode.ITINERARY_INVALID_ROUTE_PLAN);
            }
        }
    }

    private void synchronizeItineraryDays(Long tripId) {
        tripRepository.findByIdForItineraryInitialization(tripId).ifPresent(trip -> {
            LocalDate startDate = trip.getStartDate();
            LocalDate endDate = trip.getEndDate();
            if (startDate == null || endDate == null) return;

            List<LocalDate> dates = startDate.datesUntil(endDate.plusDays(1)).toList();
            List<ItineraryDay> allDays =
                    dayRepository.findAllByTripIdOrderByItineraryDateAsc(tripId);
            Set<LocalDate> targetDates = new HashSet<>(dates);
            List<ItineraryDay> obsoleteDays = allDays.stream()
                    .filter(day -> !targetDates.contains(day.getItineraryDate()))
                    .toList();
            if (!obsoleteDays.isEmpty()) {
                dayRepository.deleteAll(obsoleteDays);
                dayRepository.flush();
            }

            List<ItineraryDay> activeDays = allDays.stream()
                    .filter(day -> targetDates.contains(day.getItineraryDate()))
                    .collect(Collectors.toCollection(ArrayList::new));
            Set<LocalDate> existingDates = activeDays.stream()
                    .map(ItineraryDay::getItineraryDate)
                    .collect(Collectors.toSet());
            for (LocalDate date : dates) {
                if (!existingDates.contains(date)) {
                    activeDays.add(ItineraryDay.create(tripId, date, 0));
                }
            }

            activeDays.sort(Comparator.comparing(ItineraryDay::getItineraryDate));
            boolean dayNumbersChanged = false;
            for (int index = 0; index < activeDays.size(); index++) {
                int dayNumber = index + 1;
                if (activeDays.get(index).getDayNumber() != dayNumber) {
                    activeDays.get(index).updateDayNumber(dayNumber);
                    dayNumbersChanged = true;
                }
            }
            boolean daysCreated = activeDays.size() > allDays.size() - obsoleteDays.size();
            if (daysCreated || dayNumbersChanged) {
                dayRepository.saveAll(activeDays);
            }
        });
    }

    private RoutePlanPreviewResponse createRoutePlan(Long tripId) {
        return routePlanner.plan(
                dayRepository.findAllWithItemsByTripId(tripId),
                findSavedTripPlaces(tripId)
        );
    }

    private List<TripPlace> findSavedTripPlaces(Long tripId) {
        return tripPlaceRepository.findAllOrderedByTripIdAndStatus(
                tripId,
                TripPlaceStatus.SAVED
        );
    }

    private void recalculateDay(ItineraryDay day) {
        recalculateItems(
                itemRepository.findAllByItineraryDayOrderBySortOrderAsc(day)
        );
    }

    private void updateSortOrders(List<ItineraryItem> items) {
        for (int index = 0; index < items.size(); index++) {
            items.get(index).updateSortOrder(index);
        }
    }

    private void recalculateItems(List<ItineraryItem> items) {
        Set<Long> tripPlaceIds = items.stream()
                .map(ItineraryItem::getTripPlaceId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<Long, TripPlace> tripPlaceById = tripPlaceIds.isEmpty()
                ? Map.of()
                : tripPlaceRepository.findAllById(tripPlaceIds).stream()
                        .collect(Collectors.toMap(TripPlace::getId, place -> place));
        travelEstimator.recalculate(items, tripPlaceById);
    }

    private List<ItineraryDayResponse> buildDayResponses(Long tripId) {
        List<ItineraryDay> days = dayRepository.findAllWithItemsByTripId(tripId);
        Set<Long> tripPlaceIds = days.stream()
                .flatMap(d -> d.getItems().stream())
                .map(ItineraryItem::getTripPlaceId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        Map<Long, TripPlace> tripPlaceMap = tripPlaceIds.isEmpty() ? Map.of() :
                tripPlaceRepository.findAllById(tripPlaceIds).stream()
                        .collect(Collectors.toMap(TripPlace::getId, tp -> tp));

        return days.stream()
                .map(day -> ItineraryDayResponse.from(day, tripPlaceMap))
                .toList();
    }
}
