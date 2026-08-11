package back.backend.domain.trip.service;

import back.backend.domain.collaboration.activitylog.dto.ActivityLogCreateCommand;
import back.backend.domain.collaboration.activitylog.service.ActivityLogService;
import back.backend.domain.trip.dto.TripResponse;
import back.backend.domain.trip.entity.Trip;
import back.backend.domain.trip.entity.TripStatus;
import back.backend.domain.trip.exception.TripErrorCode;
import back.backend.domain.trip.infrastructure.TripCoverImagePreset;
import back.backend.domain.trip.port.TripCoverImageStorage;
import back.backend.domain.trip.repository.TripMemberRepository;
import back.backend.domain.trip.repository.TripRepository;
import back.backend.global.config.FrontendProperties;
import back.backend.global.exception.BusinessException;
import back.backend.domain.admin.repository.TripCoverPresetRepository;
import org.springframework.beans.factory.annotation.Autowired;
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
    private final FrontendProperties frontendProperties;
    private TripCoverPresetRepository presetRepository;

    @Autowired
    void setPresetRepository(TripCoverPresetRepository presetRepository) {
        this.presetRepository = presetRepository;
    }

    public TripCoverImageService(
            TripRepository tripRepository,
            TripMemberRepository tripMemberRepository,
            TripCoverImageStorage imageStorage,
            ActivityLogService activityLogService,
            FrontendProperties frontendProperties
    ) {
        this.tripRepository = tripRepository;
        this.tripMemberRepository = tripMemberRepository;
        this.imageStorage = imageStorage;
        this.activityLogService = activityLogService;
        this.frontendProperties = frontendProperties;
    }

    @Transactional
    public TripResponse update(Long memberId, Long tripId, MultipartFile file) {
        Trip trip = findEditableTrip(tripId, memberId);
        String imageUrl = imageStorage.store(tripId, memberId, file);
        trip.changeCoverImage(imageUrl);
        logCoverImageChanged(tripId, memberId, imageUrl);
        return TripResponse.from(trip, tripMemberRepository.countByTripId(tripId));
    }

    /**
     * 여행방 생성 시 준비된 기본 이미지 중 하나를 커버로 지정한다.
     * presetKey는 서버가 소유한 화이트리스트({@link TripCoverImagePreset})와만 대조하며,
     * 실제 이미지는 프론트엔드 정적 자산(frontend/public/assets/trip-covers/)이므로
     * frontend-base-url을 붙인 절대 URL을 coverImageUrl로 저장한다.
     */
    @Transactional
    public TripResponse updateWithPreset(Long memberId, Long tripId, String presetKey) {
        Trip trip = findEditableTrip(tripId, memberId);
        String imageUrl = resolvePresetUrl(presetKey);
        trip.changeCoverImage(imageUrl);
        logCoverImageChanged(tripId, memberId, imageUrl);
        return TripResponse.from(trip, tripMemberRepository.countByTripId(tripId));
    }

    private String resolvePresetUrl(String presetKey) {
        if (presetRepository == null) {
            return frontendProperties.getFrontendBaseUrl() + TripCoverImagePreset.from(presetKey).path();
        }
        String storedUrl = presetRepository.findByPresetKeyAndActiveTrue(presetKey)
                .orElseThrow(() -> new BusinessException(TripErrorCode.INVALID_COVER_IMAGE_PRESET))
                .getImageUrl();
        return storedUrl.startsWith("/") && !storedUrl.startsWith("/uploads/")
                ? frontendProperties.getFrontendBaseUrl() + storedUrl
                : storedUrl;
    }

    private Trip findEditableTrip(Long tripId, Long memberId) {
        return tripRepository
                .findByIdAndMemberIdAndStatusNot(tripId, memberId, TripStatus.CANCELLED)
                .orElseThrow(() -> new BusinessException(TripErrorCode.TRIP_NOT_FOUND));
    }

    private void logCoverImageChanged(Long tripId, Long memberId, String imageUrl) {
        activityLogService.create(new ActivityLogCreateCommand(
                tripId,
                memberId,
                "TRIP_COVER_UPDATED",
                "TRIP",
                tripId,
                "여행방 프로필 이미지를 변경했습니다.",
                Map.of("coverImageUrl", imageUrl)
        ));
    }
}
