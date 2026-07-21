package back.backend.domain.place.controller;

import back.backend.domain.place.dto.request.AddTripPlaceRequest;
import back.backend.domain.place.dto.request.UpdateNoteRequest;
import back.backend.domain.place.dto.request.UpdateStatusRequest;
import back.backend.domain.place.dto.response.TripPlaceResponse;
import back.backend.domain.place.entity.TripPlaceStatus;
import back.backend.domain.place.service.TripPlaceService;
import back.backend.global.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/trips/{tripId}/places")
@RequiredArgsConstructor
public class TripPlaceController {

    private final TripPlaceService tripPlaceService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<TripPlaceResponse> addPlace(
            @PathVariable Long tripId,
            @RequestBody @Valid AddTripPlaceRequest request
    ) {
        return ApiResponse.success(tripPlaceService.addPlace(tripId, request));
    }

    @GetMapping
    public ApiResponse<List<TripPlaceResponse>> getPlaces(
            @PathVariable Long tripId,
            @RequestParam(required = false) TripPlaceStatus status
    ) {
        return ApiResponse.success(tripPlaceService.getPlaces(tripId, status));
    }

    @DeleteMapping("/{tripPlaceId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deletePlace(
            @PathVariable Long tripId,
            @PathVariable Long tripPlaceId
    ) {
        tripPlaceService.deletePlace(tripId, tripPlaceId);
    }

    @PatchMapping("/{tripPlaceId}/status")
    public ApiResponse<TripPlaceResponse> updateStatus(
            @PathVariable Long tripId,
            @PathVariable Long tripPlaceId,
            @RequestBody @Valid UpdateStatusRequest request
    ) {
        return ApiResponse.success(tripPlaceService.updateStatus(tripId, tripPlaceId, request));
    }

    @PatchMapping("/{tripPlaceId}/note")
    public ApiResponse<TripPlaceResponse> updateNote(
            @PathVariable Long tripId,
            @PathVariable Long tripPlaceId,
            @RequestBody @Valid UpdateNoteRequest request
    ) {
        return ApiResponse.success(tripPlaceService.updateNote(tripId, tripPlaceId, request));
    }
}
