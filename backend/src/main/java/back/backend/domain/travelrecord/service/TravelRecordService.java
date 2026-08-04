package back.backend.domain.travelrecord.service;

import back.backend.domain.collaboration.activitylog.dto.ActivityLogCreateCommand;
import back.backend.domain.collaboration.activitylog.service.ActivityLogService;
import back.backend.domain.member.repository.MemberRepository;
import back.backend.domain.place.entity.TripPlace;
import back.backend.domain.place.repository.TripPlaceRepository;
import back.backend.domain.place.service.TripAccessChecker;
import back.backend.domain.travelrecord.dto.*;
import back.backend.domain.travelrecord.entity.*;
import back.backend.domain.travelrecord.exception.TravelRecordErrorCode;
import back.backend.domain.travelrecord.port.TravelPhotoStorage;
import back.backend.domain.travelrecord.repository.*;
import back.backend.domain.trip.entity.Trip;
import back.backend.domain.trip.repository.TripRepository;
import back.backend.global.exception.BusinessException;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
@Transactional(readOnly = true)
public class TravelRecordService {

    private final TravelRecordRepository recordRepository;
    private final TravelPhotoRepository photoRepository;
    private final TripRetrospectiveRepository retrospectiveRepository;
    private final TripRepository tripRepository;
    private final TripPlaceRepository tripPlaceRepository;
    private final MemberRepository memberRepository;
    private final TripAccessChecker accessChecker;
    private final ActivityLogService activityLogService;
    private final TravelPhotoStorage travelPhotoStorage;

    public TravelRecordService(
            TravelRecordRepository recordRepository,
            TravelPhotoRepository photoRepository,
            TripRetrospectiveRepository retrospectiveRepository,
            TripRepository tripRepository,
            TripPlaceRepository tripPlaceRepository,
            MemberRepository memberRepository,
            TripAccessChecker accessChecker,
            ActivityLogService activityLogService,
            TravelPhotoStorage travelPhotoStorage
    ) {
        this.recordRepository = recordRepository;
        this.photoRepository = photoRepository;
        this.retrospectiveRepository = retrospectiveRepository;
        this.tripRepository = tripRepository;
        this.tripPlaceRepository = tripPlaceRepository;
        this.memberRepository = memberRepository;
        this.accessChecker = accessChecker;
        this.activityLogService = activityLogService;
        this.travelPhotoStorage = travelPhotoStorage;
    }

    public TravelPhotoUploadResponse uploadPhoto(Long tripId, MultipartFile file) {
        Long memberId = accessChecker.requireEdit(tripId);
        getTrip(tripId);
        return new TravelPhotoUploadResponse(travelPhotoStorage.store(tripId, memberId, file));
    }

    @Transactional
    public TravelRecordResponse create(Long tripId, TravelRecordCreateRequest request) {
        Long memberId = accessChecker.requireEdit(tripId);
        Trip trip = getTrip(tripId);
        int dayNumber = calculateDayNumber(trip, request.visitedAt().toLocalDate());
        validateContent(request.memo(), request.imageUrls());
        List<String> imageUrls = normalizeImageUrls(request.imageUrls());
        TripPlace tripPlace = tripPlaceRepository.findByIdAndTripId(request.tripPlaceId(), tripId)
                .orElseThrow(() -> new BusinessException(TravelRecordErrorCode.TRIP_PLACE_NOT_FOUND));
        if (recordRepository.existsByTripIdAndPlaceId(tripId, tripPlace.getPlace().getId())) {
            throw new BusinessException(TravelRecordErrorCode.DUPLICATE_PLACE_RECORD);
        }

        TravelRecord record = recordRepository.save(TravelRecord.builder()
                .tripId(tripId)
                .itineraryItemId(request.itineraryItemId())
                .placeId(tripPlace.getPlace().getId())
                .recordedBy(memberId)
                .visitedAt(request.visitedAt())
                .memo(normalize(request.memo()))
                .build());
        List<TravelPhoto> photos = new ArrayList<>();
        for (int index = 0; index < imageUrls.size(); index++) {
            photos.add(TravelPhoto.builder()
                    .travelRecordId(record.getId())
                    .uploadedBy(memberId)
                    .imageUrl(imageUrls.get(index))
                    .sortOrder(index)
                    .build());
        }
        if (!photos.isEmpty()) {
            photoRepository.saveAll(photos);
        }
        activityLogService.create(new ActivityLogCreateCommand(
                tripId,
                memberId,
                null,
                "TRAVEL_RECORD_CREATED",
                "TRAVEL_RECORD",
                record.getId(),
                "DAY " + dayNumber + " 여행 기록을 작성했습니다.",
                Map.of("dayNumber", dayNumber, "photoCount", photos.size())
        ));
        return toResponse(record, request.tripPlaceId(), dayNumber, imageUrls, memberNickname(memberId));
    }

    @Transactional
    public TravelRecordResponse update(Long tripId, Long recordId, TravelRecordUpdateRequest request) {
        Long memberId = accessChecker.requireEdit(tripId);
        Trip trip = getTrip(tripId);
        validateContent(request.memo(), request.imageUrls());
        List<String> imageUrls = normalizeImageUrls(request.imageUrls());
        TravelRecord record = recordRepository.findByIdAndTripId(recordId, tripId)
                .orElseThrow(() -> new BusinessException(TravelRecordErrorCode.RECORD_NOT_FOUND));

        record.updateContent(normalize(request.memo()));
        photoRepository.deleteAllByTravelRecordId(recordId);
        List<TravelPhoto> photos = new ArrayList<>();
        for (int index = 0; index < imageUrls.size(); index++) {
            photos.add(TravelPhoto.builder()
                    .travelRecordId(recordId)
                    .uploadedBy(memberId)
                    .imageUrl(imageUrls.get(index))
                    .sortOrder(index)
                    .build());
        }
        if (!photos.isEmpty()) {
            photoRepository.saveAll(photos);
        }

        Long tripPlaceId = tripPlaceRepository.findAllOrderedByTripId(tripId).stream()
                .filter(tripPlace -> tripPlace.getPlace().getId().equals(record.getPlaceId()))
                .map(TripPlace::getId)
                .findFirst()
                .orElse(null);
        // 기록 이후 여행 날짜가 바뀌어 방문 일시가 현재 기간 밖으로 밀려났을 수 있으므로,
        // 이미 저장된 기록을 표시/수정할 때는 dayNumber 범위를 강제하지 않는다.
        int dayNumber = resolveDayNumber(trip, record.getVisitedAt().toLocalDate());
        activityLogService.create(new ActivityLogCreateCommand(
                tripId, memberId, null, "TRAVEL_RECORD_UPDATED", "TRAVEL_RECORD", recordId,
                "DAY " + dayNumber + " 공동 여행 기록을 수정했습니다.", Map.of()
        ));
        return toResponse(record, tripPlaceId, dayNumber, imageUrls, memberNickname(record.getRecordedBy()));
    }

    @Transactional
    public void delete(Long tripId, Long recordId) {
        Long memberId = accessChecker.requireEdit(tripId);
        TravelRecord record = recordRepository.findByIdAndTripId(recordId, tripId)
                .orElseThrow(() -> new BusinessException(TravelRecordErrorCode.RECORD_NOT_FOUND));
        photoRepository.deleteAllByTravelRecordId(recordId);
        recordRepository.delete(record);
        activityLogService.create(new ActivityLogCreateCommand(
                tripId, memberId, null, "TRAVEL_RECORD_DELETED", "TRAVEL_RECORD", recordId,
                "공동 여행 기록을 삭제했습니다.", Map.of()
        ));
    }

    public List<TravelRecordResponse> getRecords(Long tripId) {
        accessChecker.requireView(tripId);
        Trip trip = getTrip(tripId);
        requireTripDates(trip);
        List<TravelRecord> records = recordRepository.findAllByTripIdOrderByVisitedAtDescIdDesc(tripId);
        if (records.isEmpty()) {
            return List.of();
        }
        Map<Long, List<String>> imageUrlsByRecordId = photoRepository
                .findAllByTravelRecordIdInOrderBySortOrderAsc(
                        records.stream().map(TravelRecord::getId).toList())
                .stream()
                .collect(Collectors.groupingBy(
                        TravelPhoto::getTravelRecordId,
                        LinkedHashMap::new,
                        Collectors.mapping(TravelPhoto::getImageUrl, Collectors.toList())
                ));
        Map<Long, Long> tripPlaceIdsByPlaceId = tripPlaceRepository.findAllOrderedByTripId(tripId)
                .stream()
                .collect(Collectors.toMap(tp -> tp.getPlace().getId(), TripPlace::getId));
        Map<Long, String> nicknames = memberRepository.findAllById(
                        records.stream().map(TravelRecord::getRecordedBy).distinct().toList())
                .stream()
                .collect(Collectors.toMap(member -> member.getId(), member -> member.getNickname()));

        return records.stream()
                .map(record -> toResponse(
                        record,
                        tripPlaceIdsByPlaceId.get(record.getPlaceId()),
                        resolveDayNumber(trip, record.getVisitedAt().toLocalDate()),
                        imageUrlsByRecordId.getOrDefault(record.getId(), List.of()),
                        nicknames.getOrDefault(record.getRecordedBy(), "알 수 없는 멤버")
                ))
                .toList();
    }

    @Transactional
    public RetrospectiveResponse saveMyRetrospective(Long tripId, RetrospectiveRequest request) {
        Long memberId = accessChecker.requireEdit(tripId);
        getTrip(tripId);
        TripRetrospective retrospective = retrospectiveRepository
                .findByTripIdAndMemberId(tripId, memberId)
                .orElseGet(() -> TripRetrospective.create(tripId, memberId));
        retrospective.update(
                request.goodPoints(),
                request.improvements(),
                request.summary()
        );
        TripRetrospective saved = retrospectiveRepository.save(retrospective);
        activityLogService.create(new ActivityLogCreateCommand(
                tripId,
                memberId,
                null,
                "TRIP_RETROSPECTIVE_SAVED",
                "TRIP_RETROSPECTIVE",
                saved.getId(),
                "여행 회고를 저장했습니다.",
                Map.of()
        ));
        return toResponse(saved);
    }

    public RetrospectiveResponse getMyRetrospective(Long tripId) {
        Long memberId = accessChecker.requireView(tripId);
        return retrospectiveRepository.findByTripIdAndMemberId(tripId, memberId)
                .map(this::toResponse)
                .orElse(null);
    }

    private Trip getTrip(Long tripId) {
        return tripRepository.findById(tripId)
                .orElseThrow(() -> new BusinessException(TravelRecordErrorCode.TRIP_NOT_FOUND));
    }

    private int calculateDayNumber(Trip trip, LocalDate visitedDate) {
        requireTripDates(trip);
        if (visitedDate.isBefore(trip.getStartDate()) || visitedDate.isAfter(trip.getEndDate())) {
            throw new BusinessException(TravelRecordErrorCode.VISITED_AT_OUT_OF_RANGE);
        }
        return Math.toIntExact(ChronoUnit.DAYS.between(trip.getStartDate(), visitedDate)) + 1;
    }

    /**
     * 이미 저장된 기록의 dayNumber를 표시용으로만 계산한다. 기록 이후 여행 날짜가 바뀌어
     * 방문 일시가 현재 기간 밖에 있어도 예외를 던지지 않고 범위를 벗어난 날짜 그대로 계산한다.
     */
    private int resolveDayNumber(Trip trip, LocalDate visitedDate) {
        requireTripDates(trip);
        return Math.toIntExact(ChronoUnit.DAYS.between(trip.getStartDate(), visitedDate)) + 1;
    }

    private void requireTripDates(Trip trip) {
        if (trip.getStartDate() == null || trip.getEndDate() == null) {
            throw new BusinessException(TravelRecordErrorCode.TRIP_DATES_REQUIRED);
        }
    }

    private void validateContent(String memo, List<String> imageUrls) {
        if ((memo == null || memo.isBlank()) && (imageUrls == null || imageUrls.isEmpty())) {
            throw new BusinessException(TravelRecordErrorCode.EMPTY_RECORD);
        }
    }

    private List<String> normalizeImageUrls(List<String> imageUrls) {
        if (imageUrls == null) {
            return List.of();
        }
        return imageUrls.stream().map(String::trim).map(url -> {
            if (url.isBlank() || !(url.startsWith("/") || url.startsWith("https://"))) {
                throw new BusinessException(TravelRecordErrorCode.INVALID_IMAGE_URL);
            }
            return url;
        }).distinct().toList();
    }

    private String memberNickname(Long memberId) {
        return memberRepository.findById(memberId)
                .map(member -> member.getNickname())
                .orElse("알 수 없는 멤버");
    }

    private TravelRecordResponse toResponse(
            TravelRecord record,
            Long tripPlaceId,
            int dayNumber,
            List<String> imageUrls,
            String nickname
    ) {
        return new TravelRecordResponse(
                record.getId(),
                record.getRecordedBy(),
                nickname,
                tripPlaceId,
                record.getItineraryItemId(),
                dayNumber,
                record.getVisitedAt(),
                record.getMemo(),
                imageUrls,
                record.getCreatedAt()
        );
    }

    private RetrospectiveResponse toResponse(TripRetrospective retrospective) {
        return new RetrospectiveResponse(
                retrospective.getId(),
                retrospective.getMemberId(),
                retrospective.getGoodPoints(),
                retrospective.getImprovements(),
                retrospective.getSummary(),
                retrospective.getUpdatedAt()
        );
    }

    private String normalize(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
