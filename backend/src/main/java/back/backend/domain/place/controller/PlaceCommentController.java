package back.backend.domain.place.controller;

import back.backend.domain.place.dto.request.AddPlaceCommentRequest;
import back.backend.domain.place.dto.response.PlaceCommentResponse;
import back.backend.domain.place.service.PlaceCommentService;
import back.backend.global.response.ApiResponse;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/trips/{tripId}/places/{tripPlaceId}/comments")
@RequiredArgsConstructor
public class PlaceCommentController {

    private final PlaceCommentService commentService;

    @GetMapping
    public ApiResponse<List<PlaceCommentResponse>> getComments(
            @PathVariable Long tripId,
            @PathVariable Long tripPlaceId
    ) {
        return ApiResponse.success(commentService.getComments(tripId, tripPlaceId));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<PlaceCommentResponse> addComment(
            @PathVariable Long tripId,
            @PathVariable Long tripPlaceId,
            @RequestBody @Valid AddPlaceCommentRequest request
    ) {
        return ApiResponse.success(commentService.addComment(tripId, tripPlaceId, request));
    }

    @DeleteMapping("/{commentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteComment(
            @PathVariable Long tripId,
            @PathVariable Long tripPlaceId,
            @PathVariable Long commentId
    ) {
        commentService.deleteComment(tripId, tripPlaceId, commentId);
    }
}
