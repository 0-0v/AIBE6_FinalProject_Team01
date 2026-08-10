package back.backend.domain.place.controller;

import back.backend.domain.place.dto.response.PlaceSearchResponse;
import back.backend.domain.place.dto.response.DestinationMetadataResponse;
import back.backend.domain.place.service.PlaceSearchService;
import back.backend.domain.place.service.PlacePhotoService;
import back.backend.global.response.ApiResponse;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import java.util.concurrent.TimeUnit;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;

@RestController
@RequestMapping("/api/places")
@io.swagger.v3.oas.annotations.tags.Tag(name = "장소")
public class PlaceController {

    private final PlaceSearchService placeSearchService;
    private final PlacePhotoService placePhotoService;

    public PlaceController(PlaceSearchService placeSearchService, PlacePhotoService placePhotoService) {
        this.placeSearchService = placeSearchService;
        this.placePhotoService = placePhotoService;
    }

    @GetMapping("/search")
    @io.swagger.v3.oas.annotations.Operation(summary = "Google 장소 검색")
    public ApiResponse<List<PlaceSearchResponse>> search(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String location,
            @RequestParam(required = false) String includedType,
            @RequestParam(required = false) Double latitude,
            @RequestParam(required = false) Double longitude) {
        return ApiResponse.success(placeSearchService.search(
                query, location, includedType, latitude, longitude));
    }

    @GetMapping("/photo")
    @io.swagger.v3.oas.annotations.Operation(summary = "장소 사진 조회")
    public ResponseEntity<byte[]> getPhoto(@RequestParam String name) {
        PlacePhotoService.PhotoContent photo = placePhotoService.getPhoto(name);
        return ResponseEntity.ok()
                .contentType(photo.contentType())
                .cacheControl(CacheControl.maxAge(24, TimeUnit.HOURS).cachePrivate())
                .body(photo.bytes());
    }

    @GetMapping("/destination-metadata")
    @io.swagger.v3.oas.annotations.Operation(summary = "여행 목적지 정보 조회")
    public ApiResponse<DestinationMetadataResponse> getDestinationMetadata(
            @RequestParam String placeId
    ) {
        return ApiResponse.success(placeSearchService.getDestinationMetadata(placeId));
    }

    @GetMapping("/photo/metadata")
    @io.swagger.v3.oas.annotations.Operation(summary = "장소 대표 사진 정보 조회")
    public ResponseEntity<ApiResponse<PlacePhotoService.PhotoMetadata>> getPhotoMetadata(
            @RequestParam String placeId
    ) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(1, TimeUnit.HOURS).cachePrivate())
                .body(ApiResponse.success(placePhotoService.getPhotoMetadata(placeId)));
    }

    @GetMapping("/details")
    @io.swagger.v3.oas.annotations.Operation(summary = "Google 장소 상세 조회")
    public ApiResponse<PlaceSearchResponse> getDetails(@RequestParam String placeId) {
        return ApiResponse.success(placeSearchService.getPlaceDetails(placeId));
    }
}
