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
public class TripCoverPresetController {
    private final AdminTripCoverPresetService service;
    private final SecurityContextAccessor securityContextAccessor;

    public TripCoverPresetController(AdminTripCoverPresetService service,
                                     SecurityContextAccessor securityContextAccessor) {
        this.service = service;
        this.securityContextAccessor = securityContextAccessor;
    }

    @GetMapping("/api/trip-cover-presets")
    public ApiResponse<List<TripCoverPresetResponse>> activePresets() {
        return ApiResponse.success(service.activePresets());
    }

    @GetMapping("/api/admin/trip-cover-presets")
    public ApiResponse<List<TripCoverPresetResponse>> allPresets() {
        return ApiResponse.success(service.allPresets());
    }

    @PostMapping(value = "/api/admin/trip-cover-presets", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<TripCoverPresetResponse> add(@RequestPart("file") MultipartFile file) {
        return ApiResponse.success(service.add(securityContextAccessor.getCurrentMemberId(), file));
    }

    @PatchMapping("/api/admin/trip-cover-presets/{presetId}/active")
    public ApiResponse<TripCoverPresetResponse> setActive(
            @PathVariable Long presetId, @RequestParam boolean active) {
        return ApiResponse.success(service.setActive(
                securityContextAccessor.getCurrentMemberId(), presetId, active));
    }
}
