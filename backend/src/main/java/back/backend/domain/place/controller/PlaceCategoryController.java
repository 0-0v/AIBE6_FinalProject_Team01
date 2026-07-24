package back.backend.domain.place.controller;

import back.backend.domain.place.dto.request.CreatePlaceCategoryRequest;
import back.backend.domain.place.dto.request.ReorderPlaceCategoriesRequest;
import back.backend.domain.place.dto.request.UpdatePlaceCategoryRequest;
import back.backend.domain.place.dto.response.PlaceCategoryResponse;
import back.backend.domain.place.service.PlaceCategoryService;
import back.backend.global.response.ApiResponse;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
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

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<PlaceCategoryResponse> create(
            @PathVariable Long tripId,
            @RequestBody @Valid CreatePlaceCategoryRequest request
    ) {
        return ApiResponse.success(categoryService.create(tripId, request));
    }

    @PutMapping("/{categoryId}")
    public ApiResponse<PlaceCategoryResponse> update(
            @PathVariable Long tripId,
            @PathVariable Long categoryId,
            @RequestBody @Valid UpdatePlaceCategoryRequest request
    ) {
        return ApiResponse.success(categoryService.update(tripId, categoryId, request));
    }

    @DeleteMapping("/{categoryId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
            @PathVariable Long tripId,
            @PathVariable Long categoryId
    ) {
        categoryService.delete(tripId, categoryId);
    }

    @PutMapping("/order")
    public ApiResponse<List<PlaceCategoryResponse>> reorder(
            @PathVariable Long tripId,
            @RequestBody @Valid ReorderPlaceCategoriesRequest request
    ) {
        return ApiResponse.success(categoryService.reorder(tripId, request));
    }
}
