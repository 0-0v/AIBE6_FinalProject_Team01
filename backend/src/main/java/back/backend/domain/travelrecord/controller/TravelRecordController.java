package back.backend.domain.travelrecord.controller;

import back.backend.domain.travelrecord.dto.*;
import back.backend.domain.travelrecord.service.TravelRecordService;
import back.backend.global.response.ApiResponse;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/trips/{tripId}")
public class TravelRecordController {

    private final TravelRecordService travelRecordService;

    public TravelRecordController(TravelRecordService travelRecordService) {
        this.travelRecordService = travelRecordService;
    }

    @PostMapping("/travel-records")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<TravelRecordResponse> create(
            @PathVariable Long tripId,
            @Valid @RequestBody TravelRecordCreateRequest request
    ) {
        return ApiResponse.success(travelRecordService.create(tripId, request));
    }

    @GetMapping("/travel-records")
    public ApiResponse<List<TravelRecordResponse>> getRecords(@PathVariable Long tripId) {
        return ApiResponse.success(travelRecordService.getRecords(tripId));
    }

    @PutMapping("/retrospective")
    public ApiResponse<RetrospectiveResponse> saveRetrospective(
            @PathVariable Long tripId,
            @Valid @RequestBody RetrospectiveRequest request
    ) {
        return ApiResponse.success(travelRecordService.saveMyRetrospective(tripId, request));
    }

    @GetMapping("/retrospective/me")
    public ApiResponse<RetrospectiveResponse> getMyRetrospective(@PathVariable Long tripId) {
        return ApiResponse.success(travelRecordService.getMyRetrospective(tripId));
    }
}
