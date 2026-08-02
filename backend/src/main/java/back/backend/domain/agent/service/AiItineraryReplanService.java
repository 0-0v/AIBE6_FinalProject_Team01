package back.backend.domain.agent.service;

import back.backend.domain.agent.dto.request.AiItineraryReplanRequest;
import back.backend.domain.agent.dto.request.AiReplanReason;
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
import back.backend.domain.itinerary.service.PlaceScheduleConstraint;
import back.backend.domain.place.entity.TripPlace;
import back.backend.domain.place.repository.TripPlaceRepository;
import back.backend.domain.place.service.TripAccessChecker;
import back.backend.domain.place.service.PlaceSearchService;
import back.backend.domain.place.dto.response.PlaceOperationalDetails;
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
    private final PlaceSearchService placeSearchService;

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
        Set<Long> selectedItemIds = cutoffPolicy.movableItemIdsFrom(
                days,
                referenceTime,
                request.itineraryItemId()
        );
        if (selectedItemIds.isEmpty()) {
            throw new BusinessException(
                    ItineraryErrorCode.ITINERARY_INVALID_ROUTE_PLAN
            );
        }
        LocalDate startingDayDate = cutoffPolicy.startingDayDate(
                        days,
                        request.itineraryItemId()
                )
                .orElseThrow(() -> new BusinessException(
                        ItineraryErrorCode.ITINERARY_INVALID_ROUTE_PLAN
                ));
        ItineraryDay startingDay = days.stream()
                .filter(day -> day.getItineraryDate().equals(startingDayDate))
                .filter(day -> day.getItems().stream().anyMatch(item ->
                        Objects.equals(item.getId(), request.itineraryItemId())))
                .findFirst()
                .orElseThrow(() -> new BusinessException(
                        ItineraryErrorCode.ITINERARY_INVALID_ROUTE_PLAN
                ));
        ItineraryItem startingItem = startingDay.getItems().stream()
                .filter(item -> Objects.equals(
                        item.getId(),
                        request.itineraryItemId()
                ))
                .findFirst()
                .orElseThrow(() -> new BusinessException(
                        ItineraryErrorCode.ITINERARY_INVALID_ROUTE_PLAN
                ));
        TripPlace startingTripPlace = tripPlaceById.get(
                startingItem.getTripPlaceId()
        );
        if (startingTripPlace == null) {
            throw new BusinessException(
                    ItineraryErrorCode.ITINERARY_INVALID_ROUTE_PLAN
            );
        }
        PlaceOperationalDetails operationalDetails = requiresOperationalDetails(
                request.reasons()
        ) ? placeSearchService.getOperationalDetails(
                startingTripPlace.getPlace().getGooglePlaceId()
        ) : null;
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
        List<ItineraryDay> replannableDays = cutoffPolicy.replannableDaysFrom(
                days,
                startingDayDate
        );
        if (replannableDays.isEmpty() || movablePlaces.isEmpty()) {
            throw new BusinessException(
                    ItineraryErrorCode.ITINERARY_INVALID_ROUTE_PLAN
            );
        }

        LocalTime defaultDayStart = trip.getDayStartTime() == null
                ? LocalTime.of(9, 0) : trip.getDayStartTime();
        LocalTime replanStartTime = resolveReplanStartTime(
                startingDay,
                startingItem,
                referenceTime,
                defaultDayStart,
                request.reasons(),
                operationalDetails
        );
        ReplanPlacement placement = resolveSelectedPlacePlacement(
                replannableDays,
                startingDay,
                startingItem,
                request.reasons(),
                operationalDetails,
                replanStartTime
        );
        String replanContext = buildReplanContext(
                startingTripPlace,
                startingItem,
                request.reasons(),
                operationalDetails,
                replanStartTime
        );
        TripScheduleSettings settings = TripScheduleSettings.of(
                defaultDayStart,
                trip.getDayEndTime() == null
                        ? LocalTime.of(21, 0) : trip.getDayEndTime(),
                trip.getTravelPace() == null
                        ? TravelPace.NORMAL : trip.getTravelPace()
        ).withDayStartOverride(startingDay.getId(), replanStartTime)
                .withPlaceConstraint(
                        startingTripPlace.getId(),
                        new PlaceScheduleConstraint(
                                placement.dayId(),
                                placement.startTime(),
                                placement.reason()
                        )
                );
        return routePlanner.planMulti(
                        replannableDays,
                        movablePlaces,
                        trip.getTravelStyles(),
                        settings,
                        "REPLAN_REMAINING_ITINERARY\n" + replanContext
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

    private LocalTime resolveReplanStartTime(
            ItineraryDay startingDay,
            ItineraryItem startingItem,
            LocalDateTime now,
            LocalTime defaultDayStart,
            List<AiReplanReason> reasons,
            PlaceOperationalDetails operationalDetails
    ) {
        LocalTime start = startingItem.getStartTime() == null
                ? defaultDayStart : startingItem.getStartTime();
        if (startingDay.getItineraryDate().equals(now.toLocalDate())
                && now.toLocalTime().isAfter(start)) {
            start = now.toLocalTime().withSecond(0).withNano(0);
        }
        if (start.isBefore(defaultDayStart)) start = defaultDayStart;
        int delayMinutes = reasons.stream()
                .mapToInt(AiReplanReason::minimumDelayMinutes)
                .max()
                .orElse(0);
        start = start.plusMinutes(delayMinutes);
        if (operationalDetails != null
                && operationalDetails.nextOpenTime() != null
                && operationalDetails.nextOpenTime().toLocalDate()
                .equals(startingDay.getItineraryDate())) {
            LocalTime nextOpen = operationalDetails.nextOpenTime().toLocalTime();
            if (nextOpen.isAfter(start)) start = nextOpen;
        }
        return start;
    }

    private boolean requiresOperationalDetails(List<AiReplanReason> reasons) {
        return reasons.contains(AiReplanReason.BUSINESS_HOURS)
                || reasons.contains(AiReplanReason.TEMPORARY_CLOSURE);
    }

    private ReplanPlacement resolveSelectedPlacePlacement(
            List<ItineraryDay> replannableDays,
            ItineraryDay startingDay,
            ItineraryItem startingItem,
            List<AiReplanReason> reasons,
            PlaceOperationalDetails details,
            LocalTime replanStartTime
    ) {
        boolean operatingIssue = reasons.contains(AiReplanReason.BUSINESS_HOURS)
                || reasons.contains(AiReplanReason.TEMPORARY_CLOSURE);
        LocalDateTime originalStart = LocalDateTime.of(
                startingDay.getItineraryDate(),
                startingItem.getStartTime() == null
                        ? replanStartTime : startingItem.getStartTime()
        );
        if (operatingIssue && details != null) {
            var nextWindow = details.openingWindows().stream()
                    .filter(window -> window.opensAt().isAfter(originalStart))
                    .filter(window -> replannableDays.stream().anyMatch(day ->
                            day.getItineraryDate().equals(
                                    window.opensAt().toLocalDate()
                            )))
                    .findFirst();
            if (nextWindow.isPresent()) {
                var window = nextWindow.get();
                ItineraryDay targetDay = replannableDays.stream()
                        .filter(day -> day.getItineraryDate().equals(
                                window.opensAt().toLocalDate()
                        ))
                        .findFirst()
                        .orElseThrow();
                return new ReplanPlacement(
                        targetDay.getId(),
                        window.opensAt().toLocalTime(),
                        "Google Places에서 확인한 다음 영업 가능 시각인 "
                                + window.opensAt()
                                + " 이후로 다시 배치했습니다."
                );
            }
        }
        String labels = reasons.stream()
                .map(AiReplanReason::label)
                .distinct()
                .collect(Collectors.joining(", "));
        String evidence = operatingIssue && details == null
                ? "Google 운영정보를 확인하지 못해 사용자 입력을 우선 적용했습니다. "
                : "";
        return new ReplanPlacement(
                startingDay.getId(),
                replanStartTime,
                evidence + labels + " 사유를 반영해 " + replanStartTime
                        + " 이후로 다시 배치했습니다."
        );
    }

    private String buildReplanContext(
            TripPlace startingPlace,
            ItineraryItem startingItem,
            List<AiReplanReason> reasons,
            PlaceOperationalDetails details,
            LocalTime replanStartTime
    ) {
        String labels = reasons.stream()
                .map(AiReplanReason::label)
                .distinct()
                .collect(Collectors.joining(", "));
        StringBuilder context = new StringBuilder()
                .append("선택 장소: ")
                .append(startingPlace.getPlace().getName())
                .append(". 변경 사유: ")
                .append(labels)
                .append(". 기존 시작 시각: ")
                .append(formatTime(startingItem.getStartTime()))
                .append(". 재배치 시작 하한: ")
                .append(replanStartTime)
                .append(". 선택 장소를 누락하지 말고 이 시각 이후에 다시 배치하고, 이후 일정의 순서와 시간을 함께 조정할 것.");
        if (details != null) {
            context.append(" Google Places 운영 상태: ")
                    .append(details.businessStatus())
                    .append(", 현재 영업 여부: ")
                    .append(details.openNow())
                    .append(", 다음 개점: ")
                    .append(details.nextOpenTime())
                    .append(", 다음 폐점: ")
                    .append(details.nextCloseTime())
                    .append(".");
        }
        return context.toString();
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

    private record ReplanPlacement(
            Long dayId,
            LocalTime startTime,
            String reason
    ) {
    }
}
