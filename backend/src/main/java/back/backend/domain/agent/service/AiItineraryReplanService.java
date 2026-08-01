package back.backend.domain.agent.service;

import back.backend.domain.agent.dto.request.AiItineraryReplanRequest;
import back.backend.domain.collaboration.notification.entity.NotificationType;
import back.backend.domain.collaboration.service.CollaborationEventService;
import back.backend.domain.itinerary.dto.response.RoutePlanDayResponse;
import back.backend.domain.itinerary.dto.response.RoutePlanItemResponse;
import back.backend.domain.itinerary.dto.response.RoutePlanOption;
import back.backend.domain.itinerary.dto.response.RoutePlanPreviewResponse;
import back.backend.domain.itinerary.entity.ItineraryDay;
import back.backend.domain.itinerary.entity.ItineraryItem;
import back.backend.domain.itinerary.exception.ItineraryErrorCode;
import back.backend.domain.itinerary.repository.ItineraryDayRepository;
import back.backend.domain.itinerary.service.ItineraryRoutePlanner;
import back.backend.domain.itinerary.service.ItineraryService;
import back.backend.domain.itinerary.service.TripScheduleSettings;
import back.backend.domain.place.entity.TripPlace;
import back.backend.domain.place.repository.TripPlaceRepository;
import back.backend.domain.place.service.TripAccessChecker;
import back.backend.domain.trip.entity.TravelPace;
import back.backend.domain.trip.repository.TripRepository;
import back.backend.global.exception.BusinessException;
import back.backend.global.exception.CommonErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AiItineraryReplanService {

    private final TripAccessChecker accessChecker;
    private final TripRepository tripRepository;
    private final ItineraryDayRepository dayRepository;
    private final TripPlaceRepository tripPlaceRepository;
    private final ItineraryRoutePlanner routePlanner;
    private final ItineraryService itineraryService;
    private final AiReplanCutoffPolicy cutoffPolicy;
    private final CollaborationEventService collaborationEventService;

    @Value("${app.ai.replan.allow-outside-trip:false}")
    private boolean allowOutsideTrip;

    public List<RoutePlanOption> preview(
            Long tripId,
            AiItineraryReplanRequest request
    ) {
        accessChecker.requireEdit(tripId);
        var trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.NOT_FOUND));
        LocalDateTime referenceTime = LocalDateTime.now();
        validateTripPeriod(
                trip.getStartDate(),
                trip.getEndDate(),
                referenceTime.toLocalDate()
        );

        List<ItineraryDay> days = dayRepository.findAllWithItemsByTripId(tripId)
                .stream()
                .sorted(Comparator.comparing(ItineraryDay::getItineraryDate))
                .toList();
        if (days.isEmpty()) {
            throw new BusinessException(
                    ItineraryErrorCode.ITINERARY_INVALID_ROUTE_PLAN
            );
        }

        Map<Long, TripPlace> tripPlaceById = tripPlaceRepository
                .findAllOrderedByTripId(tripId)
                .stream()
                .collect(Collectors.toMap(TripPlace::getId, place -> place));
        Set<Long> selectedItemIds = Set.copyOf(request.itineraryItemIds());
        Set<Long> fixedPlaceIds = fixedPlaceIds(
                days,
                referenceTime,
                selectedItemIds
        );
        List<TripPlace> movablePlaces = days.stream()
                .flatMap(day -> day.getItems().stream())
                .filter(item -> selectedItemIds.contains(item.getId()))
                .filter(item -> item.getTripPlaceId() != null)
                .filter(item -> !fixedPlaceIds.contains(item.getTripPlaceId()))
                .map(item -> tripPlaceById.get(item.getTripPlaceId()))
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        List<ItineraryDay> replannableDays = days.stream()
                .filter(day -> !day.getItineraryDate().isBefore(
                        referenceTime.toLocalDate()
                ))
                .toList();
        if (replannableDays.isEmpty() || movablePlaces.isEmpty()) {
            throw new BusinessException(
                    ItineraryErrorCode.ITINERARY_INVALID_ROUTE_PLAN
            );
        }

        TripScheduleSettings settings = TripScheduleSettings.of(
                trip.getDayStartTime() == null
                        ? LocalTime.of(9, 0) : trip.getDayStartTime(),
                trip.getDayEndTime() == null
                        ? LocalTime.of(21, 0) : trip.getDayEndTime(),
                trip.getTravelPace() == null
                        ? TravelPace.NORMAL : trip.getTravelPace()
        );
        return routePlanner.planMulti(
                        replannableDays,
                        movablePlaces,
                        trip.getTravelStyles(),
                        settings,
                        "REPLAN_REMAINING_ITINERARY\n재배치 사유: "
                                + String.join(", ", request.reasons())
                )
                .stream()
                .map(option -> new RoutePlanOption(
                        option.routeLabel(),
                        mergeFixedSchedule(
                                option.plan(),
                                days,
                                tripPlaceById,
                                fixedPlaceIds
                        )
                ))
                .toList();
    }

    @Transactional
    public List<back.backend.domain.itinerary.dto.response.ItineraryDayResponse>
    apply(
            Long tripId,
            RoutePlanPreviewResponse plan
    ) {
        Long memberId = accessChecker.requireEdit(tripId);
        List<ItineraryDay> days = dayRepository.findAllWithItemsByTripId(tripId);
        LocalDateTime referenceTime = LocalDateTime.now();
        assertFixedItemsUnchanged(plan, days, referenceTime);
        var applied = itineraryService.applyReplan(tripId, plan);
        collaborationEventService.record(
                tripId,
                memberId,
                "AI_ITINERARY_REPLANNED",
                "ITINERARY",
                null,
                "AI 일정 재배치안이 승인되어 현재 시점 이후 일정에 반영됐습니다.",
                Map.of("summary", plan.summary() == null ? "" : plan.summary()),
                NotificationType.AI,
                "AI 일정 재배치"
        );
        return applied;
    }

    private void validateTripPeriod(
            LocalDate startDate,
            LocalDate endDate,
            LocalDate today
    ) {
        if (allowOutsideTrip) return;
        if (startDate == null
                || endDate == null
                || today.isBefore(startDate)
                || today.isAfter(endDate)) {
            throw new BusinessException(CommonErrorCode.CONFLICT);
        }
    }

    private Set<Long> fixedPlaceIds(
            List<ItineraryDay> days,
            LocalDateTime now,
            Set<Long> selectedItemIds
    ) {
        return days.stream()
                .flatMap(day -> day.getItems().stream()
                        .filter(item -> cutoffPolicy.isFixed(day, item, now)
                                || !selectedItemIds.contains(item.getId())))
                .map(ItineraryItem::getTripPlaceId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
    }

    private RoutePlanPreviewResponse mergeFixedSchedule(
            RoutePlanPreviewResponse futurePlan,
            List<ItineraryDay> allDays,
            Map<Long, TripPlace> tripPlaceById,
            Set<Long> fixedPlaceIds
    ) {
        Map<Long, RoutePlanDayResponse> futureDayById = futurePlan.days()
                .stream()
                .collect(Collectors.toMap(
                        RoutePlanDayResponse::dayId,
                        day -> day
                ));
        List<RoutePlanDayResponse> mergedDays = new ArrayList<>();
        int totalDistance = 0;
        int totalCount = 0;
        for (ItineraryDay day : allDays) {
            List<RoutePlanItemResponse> items = new ArrayList<>();
            day.getItems().stream()
                    .filter(item -> item.getTripPlaceId() != null)
                    .filter(item -> fixedPlaceIds.contains(item.getTripPlaceId()))
                    .sorted(Comparator.comparingInt(ItineraryItem::getSortOrder))
                    .map(item -> toFixedResponse(
                            item,
                            tripPlaceById.get(item.getTripPlaceId())
                    ))
                    .forEach(items::add);
            RoutePlanDayResponse futureDay = futureDayById.get(day.getId());
            if (futureDay != null) {
                futureDay.items().stream()
                        .filter(item -> !fixedPlaceIds.contains(
                                item.tripPlaceId()
                        ))
                        .forEach(items::add);
            }
            int dayDistance = items.stream()
                    .map(RoutePlanItemResponse::transportMeters)
                    .filter(Objects::nonNull)
                    .mapToInt(Integer::intValue)
                    .sum();
            totalDistance += dayDistance;
            totalCount += items.size();
            mergedDays.add(new RoutePlanDayResponse(
                    day.getId(),
                    day.getDayNumber(),
                    day.getItineraryDate(),
                    dayDistance,
                    List.copyOf(items)
            ));
        }
        return new RoutePlanPreviewResponse(
                futurePlan.summary(),
                totalCount,
                totalDistance,
                List.copyOf(mergedDays)
        );
    }

    private RoutePlanItemResponse toFixedResponse(
            ItineraryItem item,
            TripPlace tripPlace
    ) {
        return new RoutePlanItemResponse(
                item.getTripPlaceId(),
                tripPlace == null ? null : tripPlace.getPlace().getName(),
                tripPlace == null || tripPlace.getCategory() == null
                        ? null : tripPlace.getCategory().getName(),
                tripPlace == null || tripPlace.getCategory() == null
                        ? null : tripPlace.getCategory().getMarkerColor(),
                item.getStartTime() == null
                        ? null : item.getStartTime().toString(),
                item.getEndTime() == null
                        ? null : item.getEndTime().toString(),
                item.getTransportMinutes(),
                item.getTransportMeters(),
                item.getTransportMode(),
                item.getTransportDetail(),
                "이미 지난 일정이라 기존 계획을 유지합니다."
        );
    }

    private void assertFixedItemsUnchanged(
            RoutePlanPreviewResponse plan,
            List<ItineraryDay> days,
            LocalDateTime now
    ) {
        Map<Long, PlannedPosition> plannedPositionByPlaceId = new HashMap<>();
        for (RoutePlanDayResponse day : plan.days()) {
            for (int index = 0; index < day.items().size(); index++) {
                RoutePlanItemResponse item = day.items().get(index);
                plannedPositionByPlaceId.put(
                        item.tripPlaceId(),
                        new PlannedPosition(
                                day.dayId(),
                                index,
                                item.startTime(),
                                item.endTime()
                        )
                );
            }
        }
        for (ItineraryDay day : days) {
            List<ItineraryItem> orderedItems = day.getItems().stream()
                    .sorted(Comparator.comparingInt(
                            ItineraryItem::getSortOrder
                    ))
                    .toList();
            for (int index = 0; index < orderedItems.size(); index++) {
                ItineraryItem item = orderedItems.get(index);
                if (item.getTripPlaceId() == null
                        || !cutoffPolicy.isFixed(day, item, now)) {
                    continue;
                }
                PlannedPosition planned = plannedPositionByPlaceId.get(
                        item.getTripPlaceId()
                );
                if (planned == null
                        || !Objects.equals(planned.dayId(), day.getId())
                        || planned.sortOrder() != index
                        || !Objects.equals(
                                planned.startTime(),
                                formatTime(item.getStartTime())
                        )
                        || !Objects.equals(
                                planned.endTime(),
                                formatTime(item.getEndTime())
                        )) {
                    throw new BusinessException(
                            ItineraryErrorCode.ITINERARY_INVALID_ROUTE_PLAN
                    );
                }
            }
        }
    }

    private String formatTime(LocalTime time) {
        return time == null ? null : time.toString();
    }

    private record PlannedPosition(
            Long dayId,
            int sortOrder,
            String startTime,
            String endTime
    ) {
    }
}
