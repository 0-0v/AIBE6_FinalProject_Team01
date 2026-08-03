package back.backend.domain.card.service;

import back.backend.domain.card.dto.CopyItineraryMode;
import back.backend.domain.card.dto.CopyItineraryRequest;
import back.backend.domain.card.dto.CopyTargetResponse;
import back.backend.domain.card.entity.PlanCard;
import back.backend.domain.card.repository.PlanCardRepository;
import back.backend.domain.itinerary.entity.ItineraryDay;
import back.backend.domain.itinerary.entity.ItineraryItem;
import back.backend.domain.itinerary.repository.ItineraryDayRepository;
import back.backend.domain.itinerary.repository.ItineraryItemRepository;
import back.backend.domain.place.entity.PlaceCategory;
import back.backend.domain.place.entity.TripPlace;
import back.backend.domain.place.entity.TripPlaceStatus;
import back.backend.domain.place.repository.TripPlaceRepository;
import back.backend.domain.place.service.PlaceCategoryService;
import back.backend.domain.trip.entity.Trip;
import back.backend.domain.trip.entity.TripStatus;
import back.backend.domain.trip.entity.TripVisibility;
import back.backend.domain.trip.exception.TripErrorCode;
import back.backend.domain.trip.repository.TripRepository;
import back.backend.global.exception.BusinessException;
import java.time.temporal.ChronoUnit;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class PublicCardCopyService {
    private final PlanCardRepository cardRepository;
    private final TripRepository tripRepository;
    private final TripPlaceRepository tripPlaceRepository;
    private final ItineraryDayRepository dayRepository;
    private final ItineraryItemRepository itemRepository;
    private final PlaceCategoryService categoryService;

    public PublicCardCopyService(
            PlanCardRepository cardRepository,
            TripRepository tripRepository,
            TripPlaceRepository tripPlaceRepository,
            ItineraryDayRepository dayRepository,
            ItineraryItemRepository itemRepository,
            PlaceCategoryService categoryService
    ) {
        this.cardRepository = cardRepository;
        this.tripRepository = tripRepository;
        this.tripPlaceRepository = tripPlaceRepository;
        this.dayRepository = dayRepository;
        this.itemRepository = itemRepository;
        this.categoryService = categoryService;
    }

    public List<CopyTargetResponse> getTargets(Long memberId) {
        return tripRepository.findCopyTargets(
                        memberId,
                        EnumSet.of(TripStatus.PLANNING, TripStatus.CONFIRMED),
                        LocalDate.now())
                .stream()
                .map(trip -> CopyTargetResponse.from(
                        trip,
                        dayRepository.existsByTripId(trip.getId())
                                || tripPlaceRepository.existsByTripId(trip.getId())))
                .toList();
    }

    @Transactional
    public void copy(Long memberId, Long cardId, CopyItineraryRequest request) {
        PlanCard card = cardRepository.findById(cardId)
                .filter(value -> value.getVisibility() != TripVisibility.PRIVATE)
                .orElseThrow(() -> new BusinessException(TripErrorCode.TRIP_NOT_FOUND));
        Trip target = tripRepository.findByIdAndMemberIdAndStatusNot(
                        request.targetTripId(), memberId, TripStatus.CANCELLED)
                .filter(value -> value.getStatus() != TripStatus.COMPLETED)
                .orElseThrow(() -> new BusinessException(TripErrorCode.TRIP_NOT_FOUND));
        if (target.getStartDate() == null || target.getEndDate() == null) {
            throw new BusinessException(TripErrorCode.INVALID_TRIP, "일정을 담을 여행의 날짜를 먼저 설정해 주세요.");
        }

        if (request.mode() == CopyItineraryMode.REPLACE) {
            dayRepository.deleteAll(dayRepository.findAllWithItemsByTripId(target.getId()));
            dayRepository.flush();
            tripPlaceRepository.deleteAllByTripId(target.getId());
            tripPlaceRepository.flush();
        }

        List<PlaceCategory> categories = categoryService.ensureDefaults(target.getId());
        Map<Object, PlaceCategory> categoryByType = new HashMap<>();
        categories.forEach(category -> categoryByType.put(category.getCategoryType(), category));

        List<TripPlace> sourcePlaces = tripPlaceRepository.findAllOrderedByTripId(card.getTripId());
        Map<Long, TripPlace> targetPlaceBySourceId = new HashMap<>();
        for (TripPlace source : sourcePlaces) {
            TripPlace targetPlace = tripPlaceRepository
                    .findByTripIdAndPlaceId(target.getId(), source.getPlace().getId())
                    .orElseGet(() -> tripPlaceRepository.save(TripPlace.builder()
                            .tripId(target.getId())
                            .place(source.getPlace())
                            .category(categoryByType.get(source.getCategory().getCategoryType()))
                            .addedBy(memberId)
                            .status(TripPlaceStatus.SAVED)
                            .build()));
            targetPlaceBySourceId.put(source.getId(), targetPlace);
        }

        List<ItineraryDay> targetDays = ensureTargetDays(target);
        List<ItineraryDay> sourceDays = dayRepository.findAllWithItemsByTripId(card.getTripId());
        List<ItineraryItem> copiedItems = new ArrayList<>();
        Map<Long, Integer> nextSortOrderByDayId = new HashMap<>();
        for (ItineraryDay targetDay : targetDays) {
            nextSortOrderByDayId.put(
                    targetDay.getId(),
                    itemRepository.findAllByItineraryDayOrderBySortOrderAsc(targetDay).size());
        }
        for (ItineraryDay sourceDay : sourceDays) {
            ItineraryDay targetDay = targetDays.get(Math.min(sourceDay.getDayNumber(), targetDays.size()) - 1);
            int sortOrder = nextSortOrderByDayId.get(targetDay.getId());
            for (ItineraryItem sourceItem : sourceDay.getItems()) {
                TripPlace targetPlace = targetPlaceBySourceId.get(sourceItem.getTripPlaceId());
                if (targetPlace == null
                        || itemRepository.existsByItineraryDayTripIdAndTripPlaceId(
                                target.getId(), targetPlace.getId())) {
                    continue;
                }
                ItineraryItem copied = ItineraryItem.create(targetDay, targetPlace.getId(), sortOrder++);
                copied.updateDetails(
                        sourceItem.getStartTime(), sourceItem.getEndTime(), null,
                        sourceItem.getTransportMinutes(), sourceItem.getTransportMeters(),
                        sourceItem.getTransportMode());
                copiedItems.add(copied);
            }
            nextSortOrderByDayId.put(targetDay.getId(), sortOrder);
        }
        itemRepository.saveAll(copiedItems);
    }

    private List<ItineraryDay> ensureTargetDays(Trip target) {
        List<ItineraryDay> existing = dayRepository.findAllByTripIdOrderByItineraryDateAsc(target.getId());
        long dayCount = ChronoUnit.DAYS.between(target.getStartDate(), target.getEndDate()) + 1;
        Map<Integer, ItineraryDay> byNumber = new HashMap<>();
        existing.forEach(day -> byNumber.put(day.getDayNumber(), day));
        List<ItineraryDay> result = new ArrayList<>();
        for (int dayNumber = 1; dayNumber <= dayCount; dayNumber++) {
            int currentDayNumber = dayNumber;
            result.add(byNumber.computeIfAbsent(dayNumber, ignored -> dayRepository.save(
                    ItineraryDay.create(
                            target.getId(),
                            target.getStartDate().plusDays(currentDayNumber - 1L),
                            currentDayNumber))));
        }
        return result;
    }
}
