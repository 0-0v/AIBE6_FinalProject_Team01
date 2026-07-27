package back.backend.domain.trip.controller;

import back.backend.domain.trip.dto.TripRequest;
import back.backend.domain.trip.dto.TripResponse;
import back.backend.domain.trip.dto.TripVisibilityRequest;
import back.backend.domain.trip.dto.TripCompletionConfirmationRequest;
import back.backend.domain.trip.service.TripCompletionConfirmationService;
import back.backend.domain.trip.service.TripService;
import back.backend.domain.trip.service.TripPlanningService;
import back.backend.domain.trip.dto.DateAvailabilityRequest;
import back.backend.domain.trip.dto.DateAvailabilityResponse;
import back.backend.domain.trip.dto.DateProposalRequest;
import back.backend.domain.trip.dto.DateProposalResponse;
import back.backend.domain.trip.dto.DateVoteRequest;
import back.backend.global.response.ApiResponse;
import back.backend.global.security.SecurityContextAccessor;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/trips")
public class TripController {
    private final TripService tripService;
    private final SecurityContextAccessor securityContextAccessor;
    private final TripPlanningService tripPlanningService;
    private final TripCompletionConfirmationService tripCompletionConfirmationService;

    public TripController(
            TripService tripService,
            SecurityContextAccessor securityContextAccessor,
            TripPlanningService tripPlanningService,
            TripCompletionConfirmationService tripCompletionConfirmationService
    ) {
        this.tripService = tripService;
        this.securityContextAccessor = securityContextAccessor;
        this.tripPlanningService = tripPlanningService;
        this.tripCompletionConfirmationService = tripCompletionConfirmationService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "여행방 생성")
    public ApiResponse<TripResponse> create(@Valid @RequestBody TripRequest request) {
        return ApiResponse.success(tripService.create(securityContextAccessor.getCurrentMemberId(), request));
    }

    @GetMapping
    @Operation(summary = "내 여행방 목록 조회")
    public ApiResponse<List<TripResponse>> getMyTrips() {
        return ApiResponse.success(tripService.getMyTrips(securityContextAccessor.getCurrentMemberId()));
    }

    @GetMapping("/{tripId}")
    @Operation(summary = "여행방 상세 조회")
    public ApiResponse<TripResponse> get(@PathVariable Long tripId) {
        return ApiResponse.success(tripService.get(securityContextAccessor.getCurrentMemberId(), tripId));
    }

    @PatchMapping("/{tripId}")
    @Operation(summary = "여행방 수정")
    public ApiResponse<TripResponse> update(@PathVariable Long tripId, @Valid @RequestBody TripRequest request) {
        return ApiResponse.success(tripService.update(securityContextAccessor.getCurrentMemberId(), tripId, request));
    }

    @PatchMapping("/{tripId}/visibility")
    @Operation(summary = "여행방 공개 설정 변경")
    public ApiResponse<TripResponse> updateVisibility(
            @PathVariable Long tripId,
            @Valid @RequestBody TripVisibilityRequest request
    ) {
        return ApiResponse.success(tripService.updateVisibility(
                securityContextAccessor.getCurrentMemberId(), tripId, request));
    }

    @PostMapping("/{tripId}/completion-confirmation")
    @Operation(summary = "종료 여행방 공개 여부 및 태그 확인")
    public ApiResponse<TripResponse> confirmCompletion(
            @PathVariable Long tripId,
            @Valid @RequestBody TripCompletionConfirmationRequest request
    ) {
        return ApiResponse.success(tripCompletionConfirmationService.confirm(
                securityContextAccessor.getCurrentMemberId(), tripId, request));
    }

    @DeleteMapping("/{tripId}")
    @Operation(summary = "여행방 삭제")
    public ApiResponse<Void> delete(@PathVariable Long tripId) {
        tripService.delete(securityContextAccessor.getCurrentMemberId(), tripId);
        return ApiResponse.ok();
    }

    @PutMapping("/{tripId}/date-availability")
    @Operation(summary = "내 가능 날짜 교체")
    public ApiResponse<List<DateAvailabilityResponse>> replaceAvailability(
            @PathVariable Long tripId,
            @Valid @RequestBody DateAvailabilityRequest request
    ) {
        return ApiResponse.success(tripPlanningService.replaceAvailability(tripId, request.availableDates()));
    }

    @GetMapping("/{tripId}/date-availability")
    @Operation(summary = "멤버별 가능 날짜 조회")
    public ApiResponse<List<DateAvailabilityResponse>> getAvailability(@PathVariable Long tripId) {
        return ApiResponse.success(tripPlanningService.getAvailability(tripId));
    }

    @PutMapping("/{tripId}/date-proposal")
    @Operation(summary = "여행 날짜 제안 또는 덮어쓰기")
    public ApiResponse<DateProposalResponse> proposeDates(
            @PathVariable Long tripId,
            @Valid @RequestBody DateProposalRequest request
    ) {
        return ApiResponse.success(tripPlanningService.propose(tripId, request));
    }

    @GetMapping("/{tripId}/date-proposal")
    @Operation(summary = "여행 날짜 제안 조회")
    public ApiResponse<DateProposalResponse> getDateProposal(@PathVariable Long tripId) {
        return ApiResponse.success(tripPlanningService.getProposal(tripId));
    }

    @PostMapping("/{tripId}/date-proposal/vote")
    @Operation(summary = "여행 날짜 제안 투표")
    public ApiResponse<DateProposalResponse> voteDateProposal(
            @PathVariable Long tripId,
            @Valid @RequestBody DateVoteRequest request
    ) {
        return ApiResponse.success(tripPlanningService.vote(tripId, request));
    }

}
