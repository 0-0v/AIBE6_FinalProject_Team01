package back.backend.domain.admin.controller;

import back.backend.domain.admin.dto.TripCoverPresetResponse;
import back.backend.domain.admin.service.AdminTripCoverPresetService;
import back.backend.global.response.ApiResponse;
import back.backend.global.security.SecurityContextAccessor;
import java.util.List;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@io.swagger.v3.oas.annotations.tags.Tag(name = "관리자")
public class TripCoverPresetController {
    private final AdminTripCoverPresetService service;
    private final SecurityContextAccessor securityContextAccessor;

    public TripCoverPresetController(AdminTripCoverPresetService service,
                                     SecurityContextAccessor securityContextAccessor) {
        this.service = service;
        this.securityContextAccessor = securityContextAccessor;
    }

    @GetMapping("/api/trip-cover-presets")
    @io.swagger.v3.oas.annotations.Operation(summary = "활성 여행방 기본 커버 목록 조회")
    public ApiResponse<List<TripCoverPresetResponse>> activePresets() {
        return ApiResponse.success(service.activePresets());
    }

    @GetMapping("/api/admin/trip-cover-presets")
    @io.swagger.v3.oas.annotations.Operation(summary = "관리자 여행방 기본 커버 목록 조회")
    public ApiResponse<List<TripCoverPresetResponse>> allPresets() {
        return ApiResponse.success(service.allPresets());
    }

    @PostMapping(value = "/api/admin/trip-cover-presets", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @io.swagger.v3.oas.annotations.Operation(summary = "관리자 여행방 기본 커버 추가")
    public ApiResponse<TripCoverPresetResponse> add(@RequestPart("file") MultipartFile file) {
        return ApiResponse.success(service.add(securityContextAccessor.getCurrentMemberId(), file));
    }

    @PatchMapping("/api/admin/trip-cover-presets/{presetId}/active")
    @io.swagger.v3.oas.annotations.Operation(summary = "관리자 여행방 기본 커버 활성 상태 변경")
    public ApiResponse<TripCoverPresetResponse> setActive(
            @PathVariable Long presetId, @RequestParam boolean active) {
        return ApiResponse.success(service.setActive(
                securityContextAccessor.getCurrentMemberId(), presetId, active));
    }
}
