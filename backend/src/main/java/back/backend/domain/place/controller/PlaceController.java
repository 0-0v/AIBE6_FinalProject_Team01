package back.backend.domain.place.controller;

import back.backend.domain.place.dto.response.PlaceSearchResponse;
import back.backend.domain.place.service.PlaceSearchService;
import back.backend.global.response.ApiResponse;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/places")
public class PlaceController {

    private final PlaceSearchService placeSearchService;

    public PlaceController(PlaceSearchService placeSearchService) {
        this.placeSearchService = placeSearchService;
    }

    @GetMapping("/search")
    public ApiResponse<List<PlaceSearchResponse>> search(
            @RequestParam(required = false) String query) {
        return ApiResponse.success(placeSearchService.search(query));
    }
}
