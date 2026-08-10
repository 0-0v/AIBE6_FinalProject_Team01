package back.backend.domain.travelrecord.controller;

import back.backend.domain.travelrecord.dto.*;
import back.backend.domain.travelrecord.service.TravelRecordService;
import back.backend.global.response.ApiResponse;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/trips/{tripId}")
@io.swagger.v3.oas.annotations.tags.Tag(name = "여행 기록·회고")
public class TravelRecordController {

    private final TravelRecordService travelRecordService;

    public TravelRecordController(TravelRecordService travelRecordService) {
        this.travelRecordService = travelRecordService;
    }

    @PostMapping("/travel-records")
    @io.swagger.v3.oas.annotations.Operation(summary = "여행 기록 등록")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<TravelRecordResponse> create(
            @PathVariable Long tripId,
            @Valid @RequestBody TravelRecordCreateRequest request
    ) {
        return ApiResponse.success(travelRecordService.create(tripId, request));
    }

    @PostMapping(
            value = "/travel-record-photos",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    @io.swagger.v3.oas.annotations.Operation(summary = "여행 기록 사진 업로드")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<TravelPhotoUploadResponse> uploadPhoto(
            @PathVariable Long tripId,
            @RequestPart("file") MultipartFile file
    ) {
        return ApiResponse.success(travelRecordService.uploadPhoto(tripId, file));
    }

    @GetMapping("/travel-records")
    @io.swagger.v3.oas.annotations.Operation(summary = "여행 기록 목록 조회")
    public ApiResponse<List<TravelRecordResponse>> getRecords(@PathVariable Long tripId) {
        return ApiResponse.success(travelRecordService.getRecords(tripId));
    }

    @PutMapping("/travel-records/{recordId}")
    @io.swagger.v3.oas.annotations.Operation(summary = "여행 기록 수정")
    public ApiResponse<TravelRecordResponse> update(
            @PathVariable Long tripId,
            @PathVariable Long recordId,
            @Valid @RequestBody TravelRecordUpdateRequest request
    ) {
        return ApiResponse.success(travelRecordService.update(tripId, recordId, request));
    }

    @DeleteMapping("/travel-records/{recordId}")
    @io.swagger.v3.oas.annotations.Operation(summary = "여행 기록 삭제")
    public ApiResponse<Void> delete(@PathVariable Long tripId, @PathVariable Long recordId) {
        travelRecordService.delete(tripId, recordId);
        return ApiResponse.success(null);
    }

    @PutMapping("/retrospective")
    @io.swagger.v3.oas.annotations.Operation(summary = "내 여행 회고 저장")
    public ApiResponse<RetrospectiveResponse> saveRetrospective(
            @PathVariable Long tripId,
            @Valid @RequestBody RetrospectiveRequest request
    ) {
        return ApiResponse.success(travelRecordService.saveMyRetrospective(tripId, request));
    }

    @GetMapping("/retrospective/me")
    @io.swagger.v3.oas.annotations.Operation(summary = "내 여행 회고 조회")
    public ApiResponse<RetrospectiveResponse> getMyRetrospective(@PathVariable Long tripId) {
        return ApiResponse.success(travelRecordService.getMyRetrospective(tripId));
    }
}
