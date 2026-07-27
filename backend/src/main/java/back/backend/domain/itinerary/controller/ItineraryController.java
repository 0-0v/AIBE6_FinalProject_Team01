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
public class ItineraryController {

    private final ItineraryService itineraryService;

    @GetMapping
    public ApiResponse<List<ItineraryDayResponse>> getItinerary(@PathVariable Long tripId) {
        return ApiResponse.success(itineraryService.getItinerary(tripId));
    }

    @PostMapping("/initialize")
    public ApiResponse<List<ItineraryDayResponse>> initializeItinerary(
            @PathVariable Long tripId
    ) {
        return ApiResponse.success(itineraryService.initializeItinerary(tripId));
    }

    @PostMapping("/days/{dayId}/items")
    public ApiResponse<ItineraryDayResponse> addItem(
            @PathVariable Long tripId,
            @PathVariable Long dayId,
            @RequestBody @Valid AddItineraryItemRequest request) {
        return ApiResponse.success(itineraryService.addItem(tripId, dayId, request));
    }

    @DeleteMapping("/items/{itemId}")
    public ResponseEntity<Void> removeItem(
            @PathVariable Long tripId,
            @PathVariable Long itemId) {
        itineraryService.removeItem(tripId, itemId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/items/{itemId}")
    public ApiResponse<ItineraryItemResponse> updateItem(
            @PathVariable Long tripId,
            @PathVariable Long itemId,
            @RequestBody @Valid UpdateItineraryItemRequest request) {
        return ApiResponse.success(itineraryService.updateItem(tripId, itemId, request));
    }

    @PatchMapping("/items/{itemId}/move")
    public ApiResponse<ItineraryItemResponse> moveItem(
            @PathVariable Long tripId,
            @PathVariable Long itemId,
            @RequestBody @Valid MoveItineraryItemRequest request) {
        return ApiResponse.success(itineraryService.moveItem(tripId, itemId, request));
    }

    @PatchMapping("/days/{dayId}/items/reorder")
    public ApiResponse<ItineraryDayResponse> reorderItems(
            @PathVariable Long tripId,
            @PathVariable Long dayId,
            @RequestBody @Valid ReorderItineraryItemsRequest request) {
        return ApiResponse.success(itineraryService.reorderItems(tripId, dayId, request));
    }

    @PatchMapping("/days/{dayId}/status")
    public ApiResponse<ItineraryDayResponse> updateDayStatus(
            @PathVariable Long tripId,
            @PathVariable Long dayId,
            @RequestBody @Valid UpdateItineraryDayStatusRequest request) {
        return ApiResponse.success(itineraryService.updateDayStatus(tripId, dayId, request));
    }

    @PostMapping("/route-plan/preview")
    public ApiResponse<List<RoutePlanOption>> previewRoutePlan(
            @PathVariable Long tripId
    ) {
        return ApiResponse.success(itineraryService.previewRoutePlan(tripId));
    }

    @PostMapping("/route-plan/apply")
    public ApiResponse<List<ItineraryDayResponse>> applyRoutePlan(
            @PathVariable Long tripId,
            @RequestBody @Valid RoutePlanPreviewResponse plan
    ) {
        return ApiResponse.success(itineraryService.applyRoutePlan(tripId, plan));
    }
}
