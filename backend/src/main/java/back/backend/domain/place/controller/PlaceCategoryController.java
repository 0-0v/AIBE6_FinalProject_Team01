package back.backend.domain.place.controller;

import back.backend.domain.place.dto.response.PlaceCategoryResponse;
import back.backend.domain.place.service.PlaceCategoryService;
import back.backend.global.response.ApiResponse;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/trips/{tripId}/categories")
@RequiredArgsConstructor
public class PlaceCategoryController {

    private final PlaceCategoryService categoryService;

    @GetMapping
    public ApiResponse<List<PlaceCategoryResponse>> getCategories(@PathVariable Long tripId) {
        return ApiResponse.success(categoryService.getCategories(tripId));
    }
}
