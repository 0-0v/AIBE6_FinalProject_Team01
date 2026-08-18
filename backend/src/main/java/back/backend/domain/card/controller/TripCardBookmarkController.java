package back.backend.domain.card.controller;

import back.backend.domain.card.dto.TripSharedBookmarkResponse;
import back.backend.domain.card.service.TripCardBookmarkService;
import back.backend.global.response.ApiResponse;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@Validated
@RequiredArgsConstructor
@RequestMapping("/api/trips/{tripId}/bookmarks")
@io.swagger.v3.oas.annotations.tags.Tag(name = "여행 카드")
public class TripCardBookmarkController {
    private final TripCardBookmarkService service;

    @GetMapping
    @io.swagger.v3.oas.annotations.Operation(summary = "여행방 공유 북마크 조회")
    public ApiResponse<back.backend.global.response.PageResponse<TripSharedBookmarkResponse>> getShared(
            @PathVariable Long tripId,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return ApiResponse.success(service.getShared(tripId, page, size));
    }

    @PostMapping("/{cardId}")
    @io.swagger.v3.oas.annotations.Operation(summary = "여행방에 북마크 공유")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<Void> share(@PathVariable Long tripId, @PathVariable Long cardId) {
        service.share(tripId, cardId);
        return ApiResponse.ok();
    }

    @DeleteMapping("/{cardId}")
    @io.swagger.v3.oas.annotations.Operation(summary = "여행방 북마크 공유 해제")
    public ApiResponse<Void> unshare(@PathVariable Long tripId, @PathVariable Long cardId) {
        service.unshare(tripId, cardId);
        return ApiResponse.ok();
    }
}
