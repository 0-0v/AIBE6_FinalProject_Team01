package back.backend.domain.trip.controller;

import back.backend.domain.trip.dto.TripResponse;
import back.backend.domain.trip.service.TripCoverImageService;
import back.backend.global.response.ApiResponse;
import back.backend.global.security.SecurityContextAccessor;
import io.swagger.v3.oas.annotations.Operation;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/trips/{tripId}/cover-image")
public class TripCoverImageController {

    private final TripCoverImageService tripCoverImageService;
    private final SecurityContextAccessor securityContextAccessor;

    public TripCoverImageController(
            TripCoverImageService tripCoverImageService,
            SecurityContextAccessor securityContextAccessor
    ) {
        this.tripCoverImageService = tripCoverImageService;
        this.securityContextAccessor = securityContextAccessor;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "여행방 프로필 이미지 등록 및 변경")
    public ApiResponse<TripResponse> update(
            @PathVariable Long tripId,
            @RequestPart("file") MultipartFile file
    ) {
        return ApiResponse.success(tripCoverImageService.update(
                securityContextAccessor.getCurrentMemberId(),
                tripId,
                file
        ));
    }
}
