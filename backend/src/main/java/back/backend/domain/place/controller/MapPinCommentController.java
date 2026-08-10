package back.backend.domain.place.controller;

import back.backend.domain.place.dto.request.AddMapPinCommentRequest;
import back.backend.domain.place.dto.response.MapPinCommentResponse;
import back.backend.domain.place.dto.response.MapPinSummaryResponse;
import back.backend.domain.place.service.MapPinCommentService;
import back.backend.global.response.ApiResponse;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/trips/{tripId}/map-pins")
@RequiredArgsConstructor
@io.swagger.v3.oas.annotations.tags.Tag(name = "지도 핀 댓글")
public class MapPinCommentController {

    private final MapPinCommentService mapPinCommentService;

    @GetMapping
    @io.swagger.v3.oas.annotations.Operation(summary = "지도 핀 목록 조회")
    public ApiResponse<List<MapPinSummaryResponse>> getPinSummaries(@PathVariable Long tripId) {
        return ApiResponse.success(mapPinCommentService.getPinSummaries(tripId));
    }

    @GetMapping("/{googlePlaceId}/comments")
    @io.swagger.v3.oas.annotations.Operation(summary = "지도 핀 댓글 조회")
    public ApiResponse<List<MapPinCommentResponse>> getComments(
            @PathVariable Long tripId,
            @PathVariable String googlePlaceId
    ) {
        return ApiResponse.success(mapPinCommentService.getComments(tripId, googlePlaceId));
    }

    @PostMapping("/{googlePlaceId}/comments")
    @io.swagger.v3.oas.annotations.Operation(summary = "지도 핀 댓글 등록")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<MapPinCommentResponse> addComment(
            @PathVariable Long tripId,
            @PathVariable String googlePlaceId,
            @RequestBody @Valid AddMapPinCommentRequest request
    ) {
        return ApiResponse.success(mapPinCommentService.addComment(tripId, googlePlaceId, request));
    }
}
