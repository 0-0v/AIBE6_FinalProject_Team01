package back.backend.domain.itinerary.controller;

import back.backend.domain.itinerary.dto.request.*;
import back.backend.domain.itinerary.dto.response.ItineraryDayResponse;
import back.backend.domain.itinerary.dto.response.ItineraryItemResponse;
import back.backend.domain.itinerary.dto.response.RoutePlanOption;
import back.backend.domain.itinerary.dto.response.RoutePlanPreviewResponse;
import back.backend.domain.itinerary.service.ItineraryService;
import back.backend.global.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/trips/{tripId}/itinerary")
@RequiredArgsConstructor
@io.swagger.v3.oas.annotations.tags.Tag(name = "일정")
public class ItineraryController {

    private final ItineraryService itineraryService;

    @GetMapping
    @io.swagger.v3.oas.annotations.Operation(summary = "여행 일정 조회")
    public ApiResponse<List<ItineraryDayResponse>> getItinerary(@PathVariable Long tripId) {
        return ApiResponse.success(itineraryService.getItinerary(tripId));
    }

    @PostMapping("/initialize")
    @io.swagger.v3.oas.annotations.Operation(summary = "여행 기간별 일정 초기화")
    public ApiResponse<List<ItineraryDayResponse>> initializeItinerary(
            @PathVariable Long tripId
    ) {
        return ApiResponse.success(itineraryService.initializeItinerary(tripId));
    }

    @PostMapping("/days/{dayId}/items")
    @io.swagger.v3.oas.annotations.Operation(summary = "일정에 장소 추가")
    public ApiResponse<ItineraryDayResponse> addItem(
            @PathVariable Long tripId,
            @PathVariable Long dayId,
            @RequestBody @Valid AddItineraryItemRequest request) {
        return ApiResponse.success(itineraryService.addItem(tripId, dayId, request));
    }

    @DeleteMapping("/items/{itemId}")
    @io.swagger.v3.oas.annotations.Operation(summary = "일정 항목 삭제")
    public ResponseEntity<Void> removeItem(
            @PathVariable Long tripId,
            @PathVariable Long itemId) {
        itineraryService.removeItem(tripId, itemId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/items/{itemId}")
    @io.swagger.v3.oas.annotations.Operation(summary = "일정 항목 수정")
    public ApiResponse<ItineraryItemResponse> updateItem(
            @PathVariable Long tripId,
            @PathVariable Long itemId,
            @RequestBody @Valid UpdateItineraryItemRequest request) {
        return ApiResponse.success(itineraryService.updateItem(tripId, itemId, request));
    }

    @PatchMapping("/items/{itemId}/transport-mode")
    @io.swagger.v3.oas.annotations.Operation(summary = "일정 이동수단 변경")
    public ApiResponse<ItineraryItemResponse> updateTransportMode(
            @PathVariable Long tripId,
            @PathVariable Long itemId,
            @RequestBody @Valid UpdateItineraryTransportModeRequest request
    ) {
        return ApiResponse.success(
                itineraryService.updateTransportMode(tripId, itemId, request)
        );
    }

    @PatchMapping("/items/{itemId}/move")
    @io.swagger.v3.oas.annotations.Operation(summary = "일정 항목 날짜 이동")
    public ApiResponse<ItineraryItemResponse> moveItem(
            @PathVariable Long tripId,
            @PathVariable Long itemId,
            @RequestBody @Valid MoveItineraryItemRequest request) {
        return ApiResponse.success(itineraryService.moveItem(tripId, itemId, request));
    }

    @PatchMapping("/days/{dayId}/items/reorder")
    @io.swagger.v3.oas.annotations.Operation(summary = "일정 항목 순서 변경")
    public ApiResponse<ItineraryDayResponse> reorderItems(
            @PathVariable Long tripId,
            @PathVariable Long dayId,
            @RequestBody @Valid ReorderItineraryItemsRequest request) {
        return ApiResponse.success(itineraryService.reorderItems(tripId, dayId, request));
    }

    @PatchMapping("/days/{dayId}/departure")
    @io.swagger.v3.oas.annotations.Operation(summary = "일정 출발 장소 변경")
    public ApiResponse<ItineraryDayResponse> updateDeparture(
            @PathVariable Long tripId,
            @PathVariable Long dayId,
            @RequestBody @Valid UpdateDeparturePlaceRequest request) {
        return ApiResponse.success(itineraryService.updateDeparture(tripId, dayId, request));
    }

    @PatchMapping("/days/{dayId}/status")
    @io.swagger.v3.oas.annotations.Operation(summary = "일정 수행 상태 변경")
    public ApiResponse<ItineraryDayResponse> updateDayStatus(
            @PathVariable Long tripId,
            @PathVariable Long dayId,
            @RequestBody @Valid UpdateItineraryDayStatusRequest request) {
        return ApiResponse.success(itineraryService.updateDayStatus(tripId, dayId, request));
    }

    @PostMapping("/route-plan/preview")
    @io.swagger.v3.oas.annotations.Operation(summary = "AI 동선 초안 미리보기")
    public ApiResponse<List<RoutePlanOption>> previewRoutePlan(
            @PathVariable Long tripId,
            @RequestBody(required = false) RoutePlanSettingsRequest settings
    ) {
        return ApiResponse.success(itineraryService.previewRoutePlan(tripId, settings));
    }

    @PostMapping("/route-plan/apply")
    @io.swagger.v3.oas.annotations.Operation(summary = "AI 동선 초안 적용")
    public ApiResponse<List<ItineraryDayResponse>> applyRoutePlan(
            @PathVariable Long tripId,
            @RequestBody @Valid RoutePlanPreviewResponse plan
    ) {
        return ApiResponse.success(itineraryService.applyRoutePlan(tripId, plan));
    }
}
