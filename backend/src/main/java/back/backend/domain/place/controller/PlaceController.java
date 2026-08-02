package back.backend.domain.place.controller;

import back.backend.domain.place.dto.response.PlaceSearchResponse;
import back.backend.domain.place.service.PlaceSearchService;
import back.backend.domain.place.service.PlacePhotoService;
import back.backend.global.response.ApiResponse;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;

@RestController
@RequestMapping("/api/places")
public class PlaceController {

    private final PlaceSearchService placeSearchService;
    private final PlacePhotoService placePhotoService;

    public PlaceController(PlaceSearchService placeSearchService, PlacePhotoService placePhotoService) {
        this.placeSearchService = placeSearchService;
        this.placePhotoService = placePhotoService;
    }

    @GetMapping("/search")
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
    public ResponseEntity<byte[]> getPhoto(@RequestParam String name) {
        PlacePhotoService.PhotoContent photo = placePhotoService.getPhoto(name);
        return ResponseEntity.ok()
                .contentType(photo.contentType())
                .cacheControl(CacheControl.noStore())
                .body(photo.bytes());
    }

    @GetMapping("/photo/metadata")
    public ResponseEntity<ApiResponse<PlacePhotoService.PhotoMetadata>> getPhotoMetadata(
            @RequestParam String placeId
    ) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(ApiResponse.success(placePhotoService.getPhotoMetadata(placeId)));
    }
}
