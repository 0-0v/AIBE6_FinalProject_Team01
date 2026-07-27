package back.backend.domain.trip.service;

import back.backend.domain.collaboration.activitylog.dto.ActivityLogCreateCommand;
import back.backend.domain.collaboration.activitylog.service.ActivityLogService;
import back.backend.domain.trip.dto.TripResponse;
import back.backend.domain.trip.entity.Trip;
import back.backend.domain.trip.entity.TripStatus;
import back.backend.domain.trip.exception.TripErrorCode;
import back.backend.domain.trip.port.TripCoverImageStorage;
import back.backend.domain.trip.repository.TripMemberRepository;
import back.backend.domain.trip.repository.TripRepository;
import back.backend.global.exception.BusinessException;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class TripCoverImageService {

    private final TripRepository tripRepository;
    private final TripMemberRepository tripMemberRepository;
    private final TripCoverImageStorage imageStorage;
    private final ActivityLogService activityLogService;

    public TripCoverImageService(
            TripRepository tripRepository,
            TripMemberRepository tripMemberRepository,
            TripCoverImageStorage imageStorage,
            ActivityLogService activityLogService
    ) {
        this.tripRepository = tripRepository;
        this.tripMemberRepository = tripMemberRepository;
        this.imageStorage = imageStorage;
        this.activityLogService = activityLogService;
    }

    @Transactional
    public TripResponse update(Long memberId, Long tripId, MultipartFile file) {
        Trip trip = tripRepository
                .findByIdAndOwnerIdAndStatusNot(tripId, memberId, TripStatus.CANCELLED)
                .orElseThrow(() -> new BusinessException(TripErrorCode.TRIP_NOT_FOUND));
        String imageUrl = imageStorage.store(tripId, memberId, file);
        trip.changeCoverImage(imageUrl);
        activityLogService.create(new ActivityLogCreateCommand(
                tripId,
                memberId,
                null,
                "TRIP_COVER_UPDATED",
                "TRIP",
                tripId,
                "여행방 프로필 이미지를 변경했습니다.",
                Map.of("coverImageUrl", imageUrl)
        ));
        return TripResponse.from(trip, tripMemberRepository.countByTripId(tripId));
    }
}
