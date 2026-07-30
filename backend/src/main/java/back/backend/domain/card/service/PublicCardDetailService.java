package back.backend.domain.card.service;

import back.backend.domain.card.dto.PublicCardDetailResponse;
import back.backend.domain.card.entity.PlanCard;
import back.backend.domain.card.repository.PlanCardRepository;
import back.backend.domain.itinerary.dto.response.ItineraryDayResponse;
import back.backend.domain.itinerary.repository.ItineraryDayRepository;
import back.backend.domain.place.entity.TripPlace;
import back.backend.domain.place.repository.TripPlaceRepository;
import back.backend.domain.trip.entity.Trip;
import back.backend.domain.trip.entity.TripVisibility;
import back.backend.domain.trip.repository.TripRepository;
import back.backend.global.exception.BusinessException;
import back.backend.global.exception.CommonErrorCode;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class PublicCardDetailService {

    private final PlanCardRepository cardRepository;
    private final TripRepository tripRepository;
    private final ItineraryDayRepository dayRepository;
    private final TripPlaceRepository tripPlaceRepository;

    public PublicCardDetailService(
            PlanCardRepository cardRepository,
            TripRepository tripRepository,
            ItineraryDayRepository dayRepository,
            TripPlaceRepository tripPlaceRepository
    ) {
        this.cardRepository = cardRepository;
        this.tripRepository = tripRepository;
        this.dayRepository = dayRepository;
        this.tripPlaceRepository = tripPlaceRepository;
    }

    public PublicCardDetailResponse getDetail(Long cardId) {
        PlanCard card = cardRepository.findById(cardId)
                .filter(candidate -> candidate.getVisibility() == TripVisibility.PUBLIC)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.NOT_FOUND));
        Trip trip = tripRepository.findById(card.getTripId())
                .orElseThrow(() -> new BusinessException(CommonErrorCode.NOT_FOUND));
        Map<Long, TripPlace> tripPlaces = tripPlaceRepository.findAllOrderedByTripId(trip.getId())
                .stream()
                .collect(Collectors.toMap(TripPlace::getId, Function.identity()));
        var itinerary = dayRepository.findAllWithItemsByTripId(trip.getId()).stream()
                .map(day -> ItineraryDayResponse.from(day, tripPlaces))
                .toList();

        return new PublicCardDetailResponse(
                card.getId(),
                trip.getId(),
                card.getTitle(),
                card.getSummary(),
                trip.getDestination(),
                card.getCoverImageUrl() != null ? card.getCoverImageUrl() : trip.getCoverImageUrl(),
                trip.getStartDate(),
                trip.getEndDate(),
                itinerary);
    }
}
