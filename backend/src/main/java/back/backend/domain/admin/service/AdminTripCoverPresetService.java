package back.backend.domain.admin.service;

import back.backend.domain.admin.dto.TripCoverPresetResponse;
import back.backend.domain.admin.entity.*;
import back.backend.domain.admin.repository.AdminActionLogRepository;
import back.backend.domain.admin.repository.TripCoverPresetRepository;
import back.backend.domain.trip.port.TripCoverImageStorage;
import back.backend.global.exception.BusinessException;
import back.backend.global.exception.CommonErrorCode;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class AdminTripCoverPresetService {
    private final TripCoverPresetRepository repository;
    private final TripCoverImageStorage storage;
    private final AdminActionLogRepository actionLogRepository;

    public AdminTripCoverPresetService(TripCoverPresetRepository repository,
                                       TripCoverImageStorage storage,
                                       AdminActionLogRepository actionLogRepository) {
        this.repository = repository;
        this.storage = storage;
        this.actionLogRepository = actionLogRepository;
    }

    @Transactional(readOnly = true)
    public List<TripCoverPresetResponse> activePresets() {
        return repository.findAllByActiveTrueOrderBySortOrderAscIdAsc().stream()
                .map(TripCoverPresetResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<TripCoverPresetResponse> allPresets() {
        return repository.findAllByOrderBySortOrderAscIdAsc().stream()
                .map(TripCoverPresetResponse::from).toList();
    }

    @Transactional
    public TripCoverPresetResponse add(Long adminId, MultipartFile file) {
        String imageUrl = storage.store(0L, adminId, file);
        int sortOrder = (int) Math.min(repository.count() + 1, Integer.MAX_VALUE);
        TripCoverPreset preset = repository.save(TripCoverPreset.create(
                "ADMIN_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase(),
                imageUrl, sortOrder, adminId));
        log(adminId, preset, AdminActionType.COVER_IMAGE_ADDED, "관리자 기본 커버 이미지를 추가했습니다.");
        return TripCoverPresetResponse.from(preset);
    }

    @Transactional
    public TripCoverPresetResponse setActive(Long adminId, Long presetId, boolean active) {
        TripCoverPreset preset = repository.findById(presetId)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.NOT_FOUND));
        if (active) preset.activate(); else preset.deactivate();
        log(adminId, preset, active ? AdminActionType.COVER_IMAGE_ACTIVATED
                : AdminActionType.COVER_IMAGE_DEACTIVATED,
                active ? "기본 커버 이미지를 활성화했습니다." : "기본 커버 이미지를 비활성화했습니다.");
        return TripCoverPresetResponse.from(preset);
    }

    private void log(Long adminId, TripCoverPreset preset, AdminActionType type, String reason) {
        actionLogRepository.save(AdminActionLog.create(adminId, type,
                "TRIP_COVER_PRESET", preset.getId(), reason));
    }
}
