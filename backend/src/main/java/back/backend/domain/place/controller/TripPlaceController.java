package back.backend.domain.place.controller;

import back.backend.domain.place.dto.request.AddTripPlaceRequest;
import back.backend.domain.place.dto.response.TripPlaceResponse;
import back.backend.domain.place.dto.request.UpdateTripPlaceCategoryRequest;
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
@io.swagger.v3.oas.annotations.tags.Tag(name = "장소")
public class TripPlaceController {

    private final TripPlaceService tripPlaceService;

    @PostMapping
    @io.swagger.v3.oas.annotations.Operation(summary = "여행방에 장소 등록")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<TripPlaceResponse> addPlace(
            @PathVariable Long tripId,
            @RequestBody @Valid AddTripPlaceRequest request
    ) {
        return ApiResponse.success(tripPlaceService.addPlace(tripId, request));
    }

    @GetMapping
    @io.swagger.v3.oas.annotations.Operation(summary = "여행방 장소 목록 조회")
    public ApiResponse<List<TripPlaceResponse>> getPlaces(
            @PathVariable Long tripId,
            @RequestParam(required = false) TripPlaceStatus status
    ) {
        return ApiResponse.success(tripPlaceService.getPlaces(tripId, status));
    }

    @GetMapping("/access")
    @io.swagger.v3.oas.annotations.Operation(summary = "장소 편집 권한 확인")
    public ApiResponse<Boolean> getAccess(@PathVariable Long tripId) {
        return ApiResponse.success(tripPlaceService.canEdit(tripId));
    }

    @DeleteMapping("/{tripPlaceId}")
    @io.swagger.v3.oas.annotations.Operation(summary = "여행방 장소 삭제")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deletePlace(
            @PathVariable Long tripId,
            @PathVariable Long tripPlaceId
    ) {
        tripPlaceService.deletePlace(tripId, tripPlaceId);
    }

    @PutMapping("/{tripPlaceId}/category")
    @io.swagger.v3.oas.annotations.Operation(summary = "장소 카테고리 변경")
    public ApiResponse<TripPlaceResponse> updateCategory(
            @PathVariable Long tripId,
            @PathVariable Long tripPlaceId,
            @RequestBody @Valid UpdateTripPlaceCategoryRequest request
    ) {
        return ApiResponse.success(
                tripPlaceService.updateCategory(tripId, tripPlaceId, request.categoryId())
        );
    }

}
