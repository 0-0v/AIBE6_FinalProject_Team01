package back.backend.domain.card.controller;

import back.backend.domain.card.dto.*;
import back.backend.domain.card.service.PublicCardService;
import back.backend.domain.card.service.PublicCardDetailService;
import back.backend.global.response.ApiResponse;
import back.backend.global.security.SecurityContextAccessor;
import jakarta.validation.Valid;
import java.util.List;
import back.backend.domain.trip.entity.TravelStyle;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/cards")
public class PublicCardController {
    private final PublicCardService service;
    private final PublicCardDetailService detailService;
    private final back.backend.domain.card.service.PublicCardCopyService copyService;
    private final SecurityContextAccessor security;
    public PublicCardController(PublicCardService service,
            PublicCardDetailService detailService,
            back.backend.domain.card.service.PublicCardCopyService copyService,
            SecurityContextAccessor security) {
        this.service = service; this.detailService = detailService;
        this.copyService = copyService; this.security = security;
    }
    @GetMapping("/{cardId}/detail")
    public ApiResponse<PublicCardDetailResponse> getDetail(@PathVariable Long cardId) {
        return ApiResponse.success(detailService.getDetail(cardId));
    }
    @GetMapping("/public")
    public ApiResponse<PublicCardPageResponse> getPublicCards(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "9") int size,
            @RequestParam(defaultValue = "LATEST") CardSort sort,
            @RequestParam(required = false) String query,
            @RequestParam(required = false) TravelStyle travelStyle) {
        Long memberId = security.getCurrentPrincipal().map(principal -> principal.getMemberId()).orElse(null);
        return ApiResponse.success(service.getPublicCards(
                memberId, page, size, sort, query, travelStyle));
    }
    @GetMapping("/bookmarks")
    public ApiResponse<List<PublicCardResponse>> getBookmarks() {
        return ApiResponse.success(service.getBookmarks(security.getCurrentMemberId()));
    }
    @PostMapping("/{cardId}/bookmarks")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<Void> bookmark(@PathVariable Long cardId) {
        service.bookmark(security.getCurrentMemberId(), cardId); return ApiResponse.ok();
    }
    @DeleteMapping("/{cardId}/bookmarks")
    public ApiResponse<Void> removeBookmark(@PathVariable Long cardId) {
        service.removeBookmark(security.getCurrentMemberId(), cardId); return ApiResponse.ok();
    }
    @GetMapping("/{cardId}/comments")
    public ApiResponse<List<CardCommentResponse>> getComments(@PathVariable Long cardId) {
        Long memberId = security.getCurrentPrincipal().map(principal -> principal.getMemberId()).orElse(null);
        return ApiResponse.success(service.getComments(cardId, memberId));
    }
    @PostMapping("/{cardId}/comments")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<CardCommentResponse> addComment(
            @PathVariable Long cardId, @Valid @RequestBody CardCommentRequest request) {
        return ApiResponse.success(service.addComment(security.getCurrentMemberId(), cardId, request));
    }
    @DeleteMapping("/{cardId}/comments/{commentId}")
    public ApiResponse<Void> deleteComment(@PathVariable Long cardId, @PathVariable Long commentId) {
        service.deleteComment(security.getCurrentMemberId(), cardId, commentId); return ApiResponse.ok();
    }
    @GetMapping("/copy-targets")
    public ApiResponse<List<CopyTargetResponse>> getCopyTargets() {
        return ApiResponse.success(copyService.getTargets(security.getCurrentMemberId()));
    }
    @PostMapping("/{cardId}/itinerary-copy")
    public ApiResponse<Void> copyItinerary(
            @PathVariable Long cardId,
            @Valid @RequestBody CopyItineraryRequest request) {
        copyService.copy(security.getCurrentMemberId(), cardId, request);
        return ApiResponse.ok();
    }
}
