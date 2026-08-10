package back.backend.domain.itinerary.service;

import back.backend.domain.collaboration.activitylog.dto.ActivityLogCreateCommand;
import back.backend.domain.collaboration.activitylog.service.ActivityLogService;
import back.backend.domain.itinerary.dto.request.*;
import back.backend.domain.itinerary.dto.response.ItineraryDayResponse;
import back.backend.domain.itinerary.dto.response.ItineraryItemResponse;
import back.backend.domain.itinerary.dto.response.RoutePlanDayResponse;
import back.backend.domain.itinerary.dto.response.RoutePlanItemResponse;
import back.backend.domain.itinerary.dto.response.RoutePlanOption;
import back.backend.domain.itinerary.dto.response.RoutePlanPreviewResponse;
import back.backend.domain.itinerary.entity.*;
import back.backend.domain.itinerary.exception.ItineraryErrorCode;
import back.backend.domain.itinerary.repository.ItineraryDayRepository;
import back.backend.domain.itinerary.repository.ItineraryItemRepository;
import back.backend.domain.place.entity.PlaceCategoryType;
import back.backend.domain.place.entity.TripPlace;
import back.backend.domain.place.entity.TripPlaceStatus;
import back.backend.domain.place.repository.TripPlaceRepository;
import back.backend.domain.place.service.TripAccessChecker;
import back.backend.domain.trip.entity.TravelPace;
import back.backend.domain.trip.exception.TripErrorCode;
import back.backend.domain.trip.repository.TripRepository;
import back.backend.global.exception.BusinessException;
import back.backend.global.realtime.RealtimeEvent;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeParseException;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ItineraryService {

    private final ItineraryDayRepository dayRepository;
    private final ItineraryItemRepository itemRepository;
    private final TripPlaceRepository tripPlaceRepository;
    private final TripRepository tripRepository;
    private final TripAccessChecker accessChecker;
    private final ItineraryRoutePlanner routePlanner;
    private final ItineraryTravelEstimator travelEstimator;
    private final EntityManager entityManager;
    private final ApplicationEventPublisher eventPublisher;
    private final ActivityLogService activityLogService;

    @Transactional(readOnly = true)
    public List<ItineraryDayResponse> getItinerary(Long tripId) {
        accessChecker.requireView(tripId);
        return buildDayResponses(tripId);
    }

    @Transactional
    public List<ItineraryDayResponse> initializeItinerary(Long tripId) {
        accessChecker.requireEdit(tripId);
        synchronizeItineraryDays(tripId);
        autoSetLodgingDeparture(tripId);
        return buildDayResponses(tripId);
    }

    @Transactional
    public ItineraryDayResponse updateDeparture(
            Long tripId,
            Long dayId,
            UpdateDeparturePlaceRequest request
    ) {
        accessChecker.requireEdit(tripId);
        lockTripForUpdate(tripId);
        ItineraryDay day = findDayOrThrow(dayId, tripId);

        if ("NONE".equals(request.type())) {
            day.updateDeparture(null, null, null, null, null);
            day.updateDepartureTravelInfo(null, null, null);
            publishChanged(tripId, dayId);
            return getDayResponseById(tripId, dayId);
        }

        if ("TRIP_PLACE".equals(request.type())) {
            if (request.tripPlaceId() == null) {
                throw new BusinessException(ItineraryErrorCode.ITINERARY_ITEM_NOT_FOUND);
            }
            TripPlace tripPlace = tripPlaceRepository.findByIdAndTripId(request.tripPlaceId(), tripId)
                    .orElseThrow(() -> new BusinessException(ItineraryErrorCode.ITINERARY_ITEM_NOT_FOUND));
            day.updateDeparture(
                    "TRIP_PLACE",
                    tripPlace.getPlace().getName(),
                    tripPlace.getPlace().getLatitude(),
                    tripPlace.getPlace().getLongitude(),
                    tripPlace.getId()
            );
        } else if ("CUSTOM".equals(request.type())) {
            if (request.name() == null || request.latitude() == null || request.longitude() == null) {
                throw new BusinessException(ItineraryErrorCode.ITINERARY_ITEM_NOT_FOUND);
            }
            day.updateDeparture(
                    "CUSTOM",
                    request.name(),
                    BigDecimal.valueOf(request.latitude()),
                    BigDecimal.valueOf(request.longitude()),
                    null
            );
        } else {
            throw new BusinessException(ItineraryErrorCode.ITINERARY_ITEM_NOT_FOUND);
        }

        // 출발지 → 첫 아이템 이동 시간 재계산
        List<ItineraryItem> items = itemRepository.findAllByItineraryDayOrderBySortOrderAsc(day);
        if (!items.isEmpty()) {
            Set<Long> placeIds = items.stream()
                    .map(ItineraryItem::getTripPlaceId)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toSet());
            Map<Long, TripPlace> tripPlaceById = placeIds.isEmpty() ? Map.of()
                    : tripPlaceRepository.findAllById(placeIds).stream()
                            .collect(Collectors.toMap(TripPlace::getId, tp -> tp));
            travelEstimator.recalculateDeparture(day, items, tripPlaceById);
        }

        publishChanged(tripId, dayId);
        return getDayResponseById(tripId, dayId);
    }

    @Transactional
    public ItineraryDayResponse addItem(Long tripId, Long dayId, AddItineraryItemRequest request) {
        accessChecker.requireEdit(tripId);
        lockTripForUpdate(tripId);

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
        List<ItineraryItem> existingItems =
                new ArrayList<>(
                        itemRepository.findAllByItineraryDayOrderBySortOrderAsc(
                                day
                        )
                );
        if (request.sortOrder() > existingItems.size()) {
            throw new BusinessException(
                    ItineraryErrorCode.ITINERARY_INVALID_ITEM_ORDER
            );
        }

        for (int index = 0; index < existingItems.size(); index++) {
            existingItems.get(index).updateSortOrder(-(index + 1));
        }
        if (!existingItems.isEmpty()) {
            itemRepository.saveAllAndFlush(existingItems);
        }

        ItineraryItem item = ItineraryItem.create(
                day,
                request.tripPlaceId(),
                -(existingItems.size() + 1)
        );
        itemRepository.save(item);
        itemRepository.flush();

        existingItems.add(request.sortOrder(), item);
        updateSortOrders(existingItems);
        itemRepository.saveAllAndFlush(existingItems);
        markDayDraft(item.getItineraryDay());
        // 변경된 구간만 재계산: 삽입 위치의 이전 구간(P-1→P)과 새 구간(P→P+1)
        int p = request.sortOrder();
        Set<Integer> affected = new HashSet<>();
        if (p > 0) affected.add(p - 1);
        affected.add(p);
        recalculateItemsAt(existingItems, affected);
        // 첫 번째 위치에 삽입되면 departure → 첫 아이템 구간도 재계산
        if (p == 0) recalculateDepartureTravelIfNeeded(day, existingItems);

        publishChanged(tripId, item.getId());
        return getDayResponseById(tripId, dayId);
    }

    @Transactional
    public void removeItem(Long tripId, Long itemId) {
        accessChecker.requireEdit(tripId);
        lockTripForUpdate(tripId);
        ItineraryItem item = findItemOrThrow(itemId, tripId);
        int removedSortOrder = item.getSortOrder(); // 삭제 전 인덱스 기록
        ItineraryDay day = item.getItineraryDay();
        itemRepository.delete(item);
        itemRepository.flush();
        List<ItineraryItem> remainingItems =
                itemRepository.findAllByItineraryDayOrderBySortOrderAsc(day);
        updateSortOrders(remainingItems);
        if (!remainingItems.isEmpty()) {
            itemRepository.saveAllAndFlush(remainingItems);
        }
        markDayDraft(day);
        // 변경된 구간만 재계산: 삭제된 위치의 이전 아이템(P-1→new P)만 영향받음
        if (removedSortOrder > 0 && !remainingItems.isEmpty()) {
            recalculateItemsAt(remainingItems, Set.of(removedSortOrder - 1));
        }
        // 첫 번째 아이템 삭제 시 departure travel 재계산
        if (removedSortOrder == 0) recalculateDepartureTravelIfNeeded(day, remainingItems);
        publishChanged(tripId, itemId);
    }

    @Transactional
    public ItineraryItemResponse updateItem(Long tripId, Long itemId, UpdateItineraryItemRequest request) {
        accessChecker.requireEdit(tripId);
        lockTripForUpdate(tripId);
        ItineraryItem item = findItemOrThrow(itemId, tripId);

        LocalTime startTime = ItineraryRequestValidator.parseTime(request.startTime());
        LocalTime endTime = ItineraryRequestValidator.parseTime(request.endTime());
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
                        : item.getTransportMeters(),
                item.getTransportMode()
        );
        markDayDraft(item.getItineraryDay());

        TripPlace tp = item.getTripPlaceId() != null
                ? tripPlaceRepository.findByIdAndTripId(item.getTripPlaceId(), tripId).orElse(null)
                : null;
        publishChanged(tripId, itemId);
        return ItineraryItemResponse.from(item, tp);
    }

    @Transactional
    public ItineraryItemResponse updateTransportMode(
            Long tripId,
            Long itemId,
            UpdateItineraryTransportModeRequest request
    ) {
        accessChecker.requireEdit(tripId);
        lockTripForUpdate(tripId);
        ItineraryItem item = findItemOrThrow(itemId, tripId);
        List<ItineraryItem> dayItems =
                itemRepository.findAllByItineraryDayOrderBySortOrderAsc(
                        item.getItineraryDay()
                );
        int itemIndex = -1;
        for (int index = 0; index < dayItems.size(); index++) {
            if (Objects.equals(dayItems.get(index).getId(), item.getId())) {
                itemIndex = index;
                break;
            }
        }
        if (itemIndex < 0 || itemIndex + 1 >= dayItems.size()) {
            throw new BusinessException(
                    ItineraryErrorCode.ITINERARY_NEXT_PLACE_NOT_FOUND
            );
        }

        ItineraryItem nextItem = dayItems.get(itemIndex + 1);
        TripPlace currentPlace = findTripPlaceOrThrow(
                item.getTripPlaceId(),
                tripId
        );
        TripPlace nextPlace = findTripPlaceOrThrow(
                nextItem.getTripPlaceId(),
                tripId
        );
        Integer previousTransportMinutes = item.getTransportMinutes();
        boolean automaticallyLinked = ItineraryScheduleShiftPolicy.isAutomaticallyLinked(
                item,
                nextItem,
                previousTransportMinutes
        );
        if (request.transportMode() == ItineraryTransportMode.AUTO) {
            travelEstimator.recalculateSegmentAutomatically(
                    item,
                    currentPlace,
                    nextPlace
            );
        } else {
            travelEstimator.recalculateSegment(
                    item,
                    currentPlace,
                    nextPlace,
                    request.transportMode()
            );
        }
        ItineraryScheduleShiftPolicy.shiftFollowingTimesIfNeeded(
                dayItems.subList(itemIndex + 1, dayItems.size()),
                previousTransportMinutes,
                item.getTransportMinutes(),
                automaticallyLinked
        );
        markDayDraft(item.getItineraryDay());

        publishChanged(tripId, itemId);
        return ItineraryItemResponse.from(item, currentPlace);
    }

    @Transactional
    public ItineraryItemResponse moveItem(Long tripId, Long itemId, MoveItineraryItemRequest request) {
        accessChecker.requireEdit(tripId);
        lockTripForUpdate(tripId);
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

        // 이동 전 원본 인덱스와 순서 기록 (변경 구간 계산용)
        int originalSourceIndex = 0;
        for (int i = 0; i < sourceItems.size(); i++) {
            if (sourceItems.get(i).getId().equals(item.getId())) {
                originalSourceIndex = i;
                break;
            }
        }
        List<ItineraryItem> originalSourceOrder = new ArrayList<>(sourceItems);

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

        markDayDraft(sourceDay);
        markDayDraft(targetDay);

        if (sourceDay.getId().equals(targetDay.getId())) {
            // 같은 Day 이동: 순서가 바뀐 구간만 재계산
            recalculateItemsAt(targetItems, changedSegmentIndices(originalSourceOrder, targetItems));
        } else {
            // 다른 Day 이동: 출발 Day는 삭제 위치 이전 구간, 도착 Day는 삽입 위치 주변 구간
            if (originalSourceIndex > 0 && !sourceItems.isEmpty()) {
                recalculateItemsAt(sourceItems, Set.of(originalSourceIndex - 1));
            }
            int tp = request.sortOrder();
            Set<Integer> targetAffected = new HashSet<>();
            if (tp > 0) targetAffected.add(tp - 1);
            targetAffected.add(tp);
            recalculateItemsAt(targetItems, targetAffected);
        }

        TripPlace tp = item.getTripPlaceId() != null
                ? tripPlaceRepository.findByIdAndTripId(item.getTripPlaceId(), tripId).orElse(null)
                : null;
        publishChanged(tripId, itemId);
        return ItineraryItemResponse.from(item, tp);
    }

    @Transactional
    public ItineraryDayResponse reorderItems(Long tripId, Long dayId, ReorderItineraryItemsRequest request) {
        accessChecker.requireEdit(tripId);
        lockTripForUpdate(tripId);
        ItineraryDay day = findDayOrThrow(dayId, tripId);
        List<ItineraryItem> dayItems =
                itemRepository.findAllByItineraryDayOrderBySortOrderAsc(day);
        List<Long> requestedIds = request.itemIds();
        ItineraryRequestValidator.validateReorder(dayItems, requestedIds);

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
        markDayDraft(day);
        // 순서 변경 시 다음 장소가 달라진 구간만 재계산
        recalculateItemsAt(reorderedItems, changedSegmentIndices(dayItems, reorderedItems));

        publishChanged(tripId, dayId);
        return getDayResponseById(tripId, dayId);
    }

    @Transactional
    public ItineraryDayResponse updateDayStatus(Long tripId, Long dayId, UpdateItineraryDayStatusRequest request) {
        Long memberId = accessChecker.requireEdit(tripId);
        lockTripForUpdate(tripId);
        ItineraryDay day = findDayOrThrow(dayId, tripId);

        ItineraryDayStatus previousStatus = day.getStatus();
        day.updateStatus(request.status());

        boolean confirmed = request.status() == ItineraryDayStatus.CONFIRMED;
        String dayLabel = day.getTitle() != null ? day.getTitle() : "Day " + day.getDayNumber();
        String actionType = confirmed ? "ITINERARY_DAY_CONFIRMED" : "ITINERARY_DAY_UNCONFIRMED";
        String description = confirmed
                ? dayLabel + " 일정을 확정했습니다."
                : dayLabel + " 일정 확정을 취소했습니다.";
        activityLogService.create(new ActivityLogCreateCommand(
                tripId, memberId, actionType, "ITINERARY_DAY", dayId, description,
                Map.of("dayNumber", day.getDayNumber(), "previousStatus", previousStatus.name(), "newStatus", request.status().name())));

        publishChanged(tripId, dayId);
        return getDayResponseById(tripId, dayId);
    }

    @Transactional(readOnly = true)
    public List<RoutePlanOption> previewRoutePlan(Long tripId, RoutePlanSettingsRequest requestSettings) {
        accessChecker.requireView(tripId);
        var trip = tripRepository.findById(tripId);
        var travelStyles = trip.map(t -> t.getTravelStyles()).orElse(Set.of());

        ItineraryTransportMode defaultTransportMode = resolveTransportMode(requestSettings);
        LocalTime overrideStart = resolveTime(requestSettings != null ? requestSettings.dayStartTime() : null);
        LocalTime overrideEnd   = resolveTime(requestSettings != null ? requestSettings.dayEndTime()   : null);
        TravelPace overridePace = resolveTravelPace(requestSettings != null ? requestSettings.travelPace() : null);
        var scheduleSettings = trip.map(t -> {
            LocalTime start = overrideStart != null ? overrideStart : t.getDayStartTime();
            LocalTime end   = overrideEnd   != null ? overrideEnd   : t.getDayEndTime();
            TravelPace pace = overridePace  != null ? overridePace  : t.getTravelPace();
            return new TripScheduleSettings(
                    start != null ? start : LocalTime.of(9, 0),
                    end   != null ? end   : LocalTime.of(21, 0),
                    pace  != null ? pace  : TravelPace.NORMAL,
                    defaultTransportMode,
                    Map.of(),
                    Map.of()
            );
        }).orElse(TripScheduleSettings.defaultSettings());

        // 좌표 없는 장소 필터 (NullPointerException 방지 및 동선 정확도)
        List<TripPlace> savedPlaces = findSavedTripPlaces(tripId).stream()
                .filter(p -> p.getPlace().getLatitude() != null && p.getPlace().getLongitude() != null)
                .collect(Collectors.toList());

        return routePlanner.planMulti(
                dayRepository.findAllWithItemsByTripId(tripId),
                savedPlaces,
                travelStyles,
                scheduleSettings
        );
    }

    private ItineraryTransportMode resolveTransportMode(RoutePlanSettingsRequest settings) {
        if (settings == null || settings.transportMode() == null) return null;
        try {
            return ItineraryTransportMode.valueOf(settings.transportMode());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private LocalTime resolveTime(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return LocalTime.parse(value);
        } catch (DateTimeParseException e) {
            return null;
        }
    }

    private TravelPace resolveTravelPace(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return TravelPace.valueOf(value);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    @Transactional
    public List<ItineraryDayResponse> applyRoutePlan(
            Long tripId,
            RoutePlanPreviewResponse plan
    ) {
        return applyRoutePlanInternal(tripId, plan, false);
    }

    @Transactional
    public List<ItineraryDayResponse> applyReplan(
            Long tripId,
            RoutePlanPreviewResponse plan
    ) {
        return applyRoutePlanInternal(tripId, plan, true);
    }

    private List<ItineraryDayResponse> applyRoutePlanInternal(
            Long tripId,
            RoutePlanPreviewResponse plan,
            boolean scheduledPlacesOnly
    ) {
        accessChecker.requireEdit(tripId);
        lockTripForUpdate(tripId);
        synchronizeItineraryDays(tripId);

        List<ItineraryDay> days = dayRepository.findAllWithItemsByTripId(tripId);
        List<TripPlace> expectedPlaces = scheduledPlacesOnly
                ? tripPlaceRepository.findAllById(days.stream()
                        .flatMap(day -> day.getItems().stream())
                        .map(ItineraryItem::getTripPlaceId)
                        .filter(Objects::nonNull)
                        .collect(Collectors.toSet()))
                : findSavedTripPlaces(tripId);
        Set<Long> departurePlaceIds = days.stream()
                .map(ItineraryDay::getDepartureTripPlaceId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        expectedPlaces = expectedPlaces.stream()
                .filter(place -> !departurePlaceIds.contains(place.getId()))
                .toList();
        RoutePlanPreviewResponse effectivePlan = removeDepartureVisits(
                plan,
                departurePlaceIds
        );
        ItineraryRequestValidator.validateRoutePlan(
                effectivePlan,
                days,
                expectedPlaces
        );
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
        Set<Long> plannedTripPlaceIds = effectivePlan.days().stream()
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
        for (var plannedDay : effectivePlan.days()) {
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
                        ItineraryRequestValidator.parseTime(plannedItem.startTime()),
                        ItineraryRequestValidator.parseTime(plannedItem.endTime()),
                        item.getMemo(),
                        plannedItem.transportMinutes(),
                        plannedItem.transportMeters(),
                        plannedItem.transportMode()
                );
                item.updateTravelInformation(
                        plannedItem.transportMinutes(),
                        plannedItem.transportMeters(),
                        plannedItem.transportMode(),
                        plannedItem.transportDetail(),
                        false,
                        null
                );
                plannedItems.add(item);
            }
        }
        if (!plannedItems.isEmpty()) {
            itemRepository.saveAllAndFlush(plannedItems);
        }
        days.forEach(this::markDayDraft);
        dayRepository.saveAllAndFlush(days);
        entityManager.clear();
        publishChanged(tripId, null);
        return buildDayResponses(tripId);
    }

    private RoutePlanPreviewResponse removeDepartureVisits(
            RoutePlanPreviewResponse plan,
            Set<Long> departurePlaceIds
    ) {
        if (plan == null || plan.days() == null || departurePlaceIds.isEmpty()) {
            return plan;
        }
        List<RoutePlanDayResponse> sanitizedDays = plan.days().stream()
                .map(day -> {
                    if (day == null || day.items() == null) {
                        return day;
                    }
                    List<RoutePlanItemResponse> visitItems = day.items().stream()
                            .filter(item -> item == null
                                    || !departurePlaceIds.contains(item.tripPlaceId()))
                            .toList();
                    return new RoutePlanDayResponse(
                            day.dayId(),
                            day.dayNumber(),
                            day.itineraryDate(),
                            day.totalDistanceMeters(),
                            visitItems
                    );
                })
                .toList();
        int visitCount = sanitizedDays.stream()
                .filter(Objects::nonNull)
                .map(RoutePlanDayResponse::items)
                .filter(Objects::nonNull)
                .mapToInt(List::size)
                .sum();
        return new RoutePlanPreviewResponse(
                plan.summary(),
                visitCount,
                plan.totalDistanceMeters(),
                sanitizedDays
        );
    }

    // ── private helpers ──────────────────────────────────────

    private void publishChanged(Long tripId, Long targetId) {
        eventPublisher.publishEvent(
                RealtimeEvent.activity(tripId, "ITINERARY", targetId));
    }

    private ItineraryDay findDayOrThrow(Long dayId, Long tripId) {
        return dayRepository.findByIdAndTripId(dayId, tripId)
                .orElseThrow(() -> new BusinessException(ItineraryErrorCode.ITINERARY_DAY_NOT_FOUND));
    }

    private ItineraryItem findItemOrThrow(Long itemId, Long tripId) {
        return itemRepository.findByIdAndTripId(itemId, tripId)
                .orElseThrow(() -> new BusinessException(ItineraryErrorCode.ITINERARY_ITEM_NOT_FOUND));
    }

    private void lockTripForUpdate(Long tripId) {
        tripRepository.findByIdForUpdate(tripId)
                .orElseThrow(() -> new BusinessException(
                        TripErrorCode.TRIP_NOT_FOUND
                ));
    }

    private void markDayDraft(ItineraryDay day) {
        if (day.getStatus() == ItineraryDayStatus.CONFIRMED) {
            day.updateStatus(ItineraryDayStatus.DRAFT);
        }
    }

    private TripPlace findTripPlaceOrThrow(Long tripPlaceId, Long tripId) {
        if (tripPlaceId == null) {
            throw new BusinessException(
                    ItineraryErrorCode.ITINERARY_ITEM_NOT_FOUND
            );
        }
        return tripPlaceRepository.findByIdAndTripId(tripPlaceId, tripId)
                .orElseThrow(() -> new BusinessException(
                        ItineraryErrorCode.ITINERARY_ITEM_NOT_FOUND
                ));
    }

    private ItineraryDayResponse getDayResponseById(Long tripId, Long dayId) {
        return buildDayResponses(tripId).stream()
                .filter(d -> d.id().equals(dayId))
                .findFirst()
                .orElseThrow(() ->
                        new BusinessException(ItineraryErrorCode.ITINERARY_DAY_NOT_FOUND));
    }
    private void synchronizeItineraryDays(Long tripId) {
        tripRepository.findByIdForItineraryInitialization(tripId).ifPresent(trip -> {
            LocalDate startDate = trip.getStartDate();
            LocalDate endDate = trip.getEndDate();
            if (startDate == null || endDate == null) return;

            List<LocalDate> newDates = startDate.datesUntil(endDate.plusDays(1)).toList();
            List<ItineraryDay> existingDays = new ArrayList<>(
                    dayRepository.findAllByTripIdOrderByItineraryDateAsc(tripId));
            existingDays.sort(
                    Comparator.comparingInt(ItineraryDay::getDayNumber)
                            .thenComparing(ItineraryDay::getItineraryDate));

            int overlap = Math.min(existingDays.size(), newDates.size());
            List<ItineraryDay> overflowDays =
                    existingDays.subList(overlap, existingDays.size());
            List<ItineraryDay> obsoleteEmptyOverflow = overflowDays.stream()
                    .filter(day -> day.getItems().isEmpty())
                    .toList();
            List<ItineraryDay> preservedOverflow = overflowDays.stream()
                    .filter(day -> !day.getItems().isEmpty())
                    .toList();
            if (!obsoleteEmptyOverflow.isEmpty()) {
                dayRepository.deleteAll(obsoleteEmptyOverflow);
                dayRepository.flush();
            }

            boolean overlapChanged = false;
            for (int index = 0; index < overlap; index++) {
                ItineraryDay day = existingDays.get(index);
                if (!day.getItineraryDate().equals(newDates.get(index))
                        || day.getDayNumber() != index + 1) {
                    overlapChanged = true;
                    break;
                }
            }

            List<ItineraryDay> newlyCreated = new ArrayList<>();
            for (int index = overlap; index < newDates.size(); index++) {
                newlyCreated.add(ItineraryDay.create(tripId, newDates.get(index), index + 1));
            }

            boolean preservedChanged = false;
            for (int index = 0; index < preservedOverflow.size(); index++) {
                ItineraryDay day = preservedOverflow.get(index);
                LocalDate placeholderDate = endDate.plusDays(index + 1L);
                int dayNumber = newDates.size() + index + 1;
                if (day.getDayNumber() != dayNumber
                        || !day.getItineraryDate().equals(placeholderDate)) {
                    preservedChanged = true;
                    break;
                }
            }

            if (!overlapChanged && newlyCreated.isEmpty() && !preservedChanged) return;

            // (trip_id, itinerary_date) 유니크 제약과 충돌하지 않도록, 남길 Day 전부를
            // 임시 날짜로 먼저 옮겨 저장한 뒤 최종 날짜로 다시 옮기는 2단계로 처리한다.
            // (넘치는 보존 Day의 원래 날짜가 새로 배정될 날짜와 겹칠 수 있어 단순 치환은 위험하다.)
            List<ItineraryDay> keptDays = new ArrayList<>(existingDays.subList(0, overlap));
            keptDays.addAll(preservedOverflow);
            if (!keptDays.isEmpty()) {
                for (ItineraryDay day : keptDays) {
                    day.updateItineraryDate(LocalDate.ofEpochDay(-1_000_000L - day.getId()));
                }
                dayRepository.saveAll(keptDays);
                dayRepository.flush();
            }

            for (int index = 0; index < overlap; index++) {
                ItineraryDay day = existingDays.get(index);
                day.updateItineraryDate(newDates.get(index));
                day.updateDayNumber(index + 1);
            }
            for (int index = 0; index < preservedOverflow.size(); index++) {
                ItineraryDay day = preservedOverflow.get(index);
                day.updateItineraryDate(endDate.plusDays(index + 1L));
                day.updateDayNumber(newDates.size() + index + 1);
            }

            List<ItineraryDay> toSave = new ArrayList<>(existingDays.subList(0, overlap));
            toSave.addAll(newlyCreated);
            toSave.addAll(preservedOverflow);
            dayRepository.saveAll(toSave);
        });
    }



    /**
     * 출발지가 없는 날에 한해, 저장된 숙소(LODGING) 중 첫 번째를 기본 출발지로 설정합니다.
     * 숙소가 없으면 아무 작업도 하지 않습니다.
     */
    private void autoSetLodgingDeparture(Long tripId) {
        List<TripPlace> lodgings = tripPlaceRepository
                .findAllOrderedByTripIdAndStatus(tripId, TripPlaceStatus.SAVED)
                .stream()
                .filter(tp -> tp.getCategory() != null
                        && PlaceCategoryType.LODGING == tp.getCategory().getCategoryType())
                .toList();

        if (lodgings.isEmpty()) return;

        TripPlace defaultLodging = lodgings.get(0);
        List<ItineraryDay> days = dayRepository.findAllByTripIdOrderByItineraryDateAsc(tripId);

        for (ItineraryDay day : days) {
            if (day.hasDeparture()) continue; // 이미 설정된 날은 건드리지 않음
            day.updateDeparture(
                    "TRIP_PLACE",
                    defaultLodging.getPlace().getName(),
                    defaultLodging.getPlace().getLatitude(),
                    defaultLodging.getPlace().getLongitude(),
                    defaultLodging.getId()
            );
        }
        if (!days.isEmpty()) {
            dayRepository.saveAll(days);
        }
    }

    /**
     * 첫 번째 아이템이 바뀌었을 때 departure travel 정보를 재계산합니다.
     */
    private void recalculateDepartureTravelIfNeeded(
            ItineraryDay day,
            List<ItineraryItem> items
    ) {
        if (!day.hasDeparture()) return;
        Set<Long> placeIds = items.stream()
                .map(ItineraryItem::getTripPlaceId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<Long, TripPlace> tripPlaceById = placeIds.isEmpty() ? Map.of()
                : tripPlaceRepository.findAllById(placeIds).stream()
                        .collect(Collectors.toMap(TripPlace::getId, tp -> tp));
        travelEstimator.recalculateDeparture(day, items, tripPlaceById);
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

    /** 변경된 인덱스의 구간만 재계산 — Routes API 호출 최소화용 */
    private void recalculateItemsAt(List<ItineraryItem> items, Set<Integer> indices) {
        if (items.isEmpty() || indices.isEmpty()) return;
        Set<Long> tripPlaceIds = items.stream()
                .map(ItineraryItem::getTripPlaceId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<Long, TripPlace> tripPlaceById = tripPlaceIds.isEmpty()
                ? Map.of()
                : tripPlaceRepository.findAllById(tripPlaceIds).stream()
                        .collect(Collectors.toMap(TripPlace::getId, place -> place));
        travelEstimator.recalculateAt(items, tripPlaceById, indices);
    }

    /**
     * newOrder 내에서 구간(i → i+1)의 다음 장소가 oldOrder와 달라진 인덱스를 반환합니다.
     * 드래그·이동 시 실제로 변경된 구간만 API를 호출하기 위해 사용합니다.
     */
    private Set<Integer> changedSegmentIndices(
            List<ItineraryItem> oldOrder,
            List<ItineraryItem> newOrder
    ) {
        Map<Long, Long> oldNextMap = new HashMap<>();
        for (int i = 0; i < oldOrder.size(); i++) {
            Long nextTpId = i + 1 < oldOrder.size()
                    ? oldOrder.get(i + 1).getTripPlaceId() : null;
            oldNextMap.put(oldOrder.get(i).getId(), nextTpId);
        }
        Set<Integer> changed = new HashSet<>();
        for (int i = 0; i < newOrder.size(); i++) {
            Long itemId = newOrder.get(i).getId();
            Long newNext = i + 1 < newOrder.size()
                    ? newOrder.get(i + 1).getTripPlaceId() : null;
            if (!Objects.equals(newNext, oldNextMap.getOrDefault(itemId, null))) {
                changed.add(i);
            }
        }
        return changed;
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
