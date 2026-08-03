package back.backend.domain.card.service;

import back.backend.domain.card.dto.PublicCardDetailResponse;
import back.backend.domain.card.dto.PublicCardRecordResponse;
import back.backend.domain.card.entity.PlanCard;
import back.backend.domain.card.repository.PlanCardRepository;
import back.backend.domain.itinerary.dto.response.ItineraryDayResponse;
import back.backend.domain.itinerary.repository.ItineraryDayRepository;
import back.backend.domain.member.repository.MemberRepository;
import back.backend.domain.place.entity.TripPlace;
import back.backend.domain.place.repository.TripPlaceRepository;
import back.backend.domain.travelrecord.entity.TravelPhoto;
import back.backend.domain.travelrecord.entity.TravelRecord;
import back.backend.domain.travelrecord.repository.TravelPhotoRepository;
import back.backend.domain.travelrecord.repository.TravelRecordRepository;
import back.backend.domain.trip.entity.Trip;
import back.backend.domain.trip.entity.TripVisibility;
import back.backend.domain.trip.repository.TripRepository;
import back.backend.global.exception.BusinessException;
import back.backend.global.exception.CommonErrorCode;
import java.util.LinkedHashMap;
import java.util.List;
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
    private final TravelRecordRepository travelRecordRepository;
    private final TravelPhotoRepository travelPhotoRepository;
    private final MemberRepository memberRepository;

    public PublicCardDetailService(
            PlanCardRepository cardRepository,
            TripRepository tripRepository,
            ItineraryDayRepository dayRepository,
            TripPlaceRepository tripPlaceRepository,
            TravelRecordRepository travelRecordRepository,
            TravelPhotoRepository travelPhotoRepository,
            MemberRepository memberRepository
    ) {
        this.cardRepository = cardRepository;
        this.tripRepository = tripRepository;
        this.dayRepository = dayRepository;
        this.tripPlaceRepository = tripPlaceRepository;
        this.travelRecordRepository = travelRecordRepository;
        this.travelPhotoRepository = travelPhotoRepository;
        this.memberRepository = memberRepository;
    }

    public PublicCardDetailResponse getDetail(Long cardId) {
        PlanCard card = cardRepository.findById(cardId)
                .filter(candidate -> candidate.getVisibility() != TripVisibility.PRIVATE)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.NOT_FOUND));
        Trip trip = tripRepository.findById(card.getTripId())
                .orElseThrow(() -> new BusinessException(CommonErrorCode.NOT_FOUND));
        List<TripPlace> tripPlaceList = tripPlaceRepository.findAllOrderedByTripId(trip.getId());
        Map<Long, TripPlace> tripPlaces = tripPlaceList.stream()
                .collect(Collectors.toMap(TripPlace::getId, Function.identity()));
        var itinerary = dayRepository.findAllWithItemsByTripId(trip.getId()).stream()
                .map(day -> ItineraryDayResponse.from(day, tripPlaces))
                .toList();
        List<PublicCardRecordResponse> records = card.getVisibility() == TripVisibility.PUBLIC_RECORD
                ? getRecords(trip.getId(), tripPlaceList)
                : List.of();

        return new PublicCardDetailResponse(
                card.getId(),
                trip.getId(),
                card.getTitle(),
                card.getSummary(),
                trip.getDestination(),
                card.getCoverImageUrl() != null ? card.getCoverImageUrl() : trip.getCoverImageUrl(),
                trip.getStartDate(),
                trip.getEndDate(),
                card.getVisibility(),
                itinerary,
                records);
    }

    private List<PublicCardRecordResponse> getRecords(Long tripId, List<TripPlace> tripPlaceList) {
        List<TravelRecord> travelRecords = travelRecordRepository.findAllByTripIdOrderByVisitedAtDescIdDesc(tripId);
        if (travelRecords.isEmpty()) {
            return List.of();
        }
        Map<Long, String> placeNamesByPlaceId = tripPlaceList.stream()
                .collect(Collectors.toMap(tripPlace -> tripPlace.getPlace().getId(),
                        tripPlace -> tripPlace.getPlace().getName(), (first, second) -> first));
        Map<Long, Long> tripPlaceIdsByPlaceId = tripPlaceList.stream()
                .collect(Collectors.toMap(tripPlace -> tripPlace.getPlace().getId(),
                        TripPlace::getId, (first, second) -> first));
        Map<Long, String> categoryNamesByPlaceId = tripPlaceList.stream()
                .filter(tripPlace -> tripPlace.getCategory() != null)
                .collect(Collectors.toMap(tripPlace -> tripPlace.getPlace().getId(),
                        tripPlace -> tripPlace.getCategory().getName(), (first, second) -> first));
        Map<Long, String> addressesByPlaceId = tripPlaceList.stream()
                .filter(tripPlace -> tripPlace.getPlace().getAddress() != null)
                .collect(Collectors.toMap(tripPlace -> tripPlace.getPlace().getId(),
                        tripPlace -> tripPlace.getPlace().getAddress(), (first, second) -> first));
        Map<Long, List<String>> imageUrlsByRecordId = travelPhotoRepository
                .findAllByTravelRecordIdInOrderBySortOrderAsc(
                        travelRecords.stream().map(TravelRecord::getId).toList())
                .stream()
                .collect(Collectors.groupingBy(
                        TravelPhoto::getTravelRecordId,
                        LinkedHashMap::new,
                        Collectors.mapping(TravelPhoto::getImageUrl, Collectors.toList())
                ));
        Map<Long, String> nicknames = memberRepository.findAllById(
                        travelRecords.stream().map(TravelRecord::getRecordedBy).distinct().toList())
                .stream()
                .collect(Collectors.toMap(member -> member.getId(), member -> member.getNickname()));

        return travelRecords.stream()
                .map(record -> new PublicCardRecordResponse(
                        record.getId(),
                        tripPlaceIdsByPlaceId.get(record.getPlaceId()),
                        placeNamesByPlaceId.getOrDefault(record.getPlaceId(), "장소 미정"),
                        categoryNamesByPlaceId.get(record.getPlaceId()),
                        addressesByPlaceId.get(record.getPlaceId()),
                        record.getMemo(),
                        imageUrlsByRecordId.getOrDefault(record.getId(), List.of()),
                        nicknames.getOrDefault(record.getRecordedBy(), "알 수 없는 멤버"),
                        record.getVisitedAt()
                ))
                .toList();
    }
}
