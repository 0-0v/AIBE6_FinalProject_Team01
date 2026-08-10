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
@io.swagger.v3.oas.annotations.tags.Tag(name = "여행 카드")
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
    @io.swagger.v3.oas.annotations.Operation(summary = "여행 카드 상세 조회")
    public ApiResponse<PublicCardDetailResponse> getDetail(@PathVariable Long cardId) {
        return ApiResponse.success(detailService.getDetail(cardId));
    }
    @GetMapping("/public")
    @io.swagger.v3.oas.annotations.Operation(summary = "공개 여행 카드 목록 조회")
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
    @io.swagger.v3.oas.annotations.Operation(summary = "내 북마크 여행 카드 조회")
    public ApiResponse<List<PublicCardResponse>> getBookmarks() {
        return ApiResponse.success(service.getBookmarks(security.getCurrentMemberId()));
    }
    @PostMapping("/{cardId}/bookmarks")
    @io.swagger.v3.oas.annotations.Operation(summary = "여행 카드 북마크 등록")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<Void> bookmark(@PathVariable Long cardId) {
        service.bookmark(security.getCurrentMemberId(), cardId); return ApiResponse.ok();
    }
    @DeleteMapping("/{cardId}/bookmarks")
    @io.swagger.v3.oas.annotations.Operation(summary = "여행 카드 북마크 해제")
    public ApiResponse<Void> removeBookmark(@PathVariable Long cardId) {
        service.removeBookmark(security.getCurrentMemberId(), cardId); return ApiResponse.ok();
    }
    @GetMapping("/{cardId}/comments")
    @io.swagger.v3.oas.annotations.Operation(summary = "여행 카드 댓글 조회")
    public ApiResponse<List<CardCommentResponse>> getComments(@PathVariable Long cardId) {
        Long memberId = security.getCurrentPrincipal().map(principal -> principal.getMemberId()).orElse(null);
        return ApiResponse.success(service.getComments(cardId, memberId));
    }
    @PostMapping("/{cardId}/comments")
    @io.swagger.v3.oas.annotations.Operation(summary = "여행 카드 댓글 등록")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<CardCommentResponse> addComment(
            @PathVariable Long cardId, @Valid @RequestBody CardCommentRequest request) {
        return ApiResponse.success(service.addComment(security.getCurrentMemberId(), cardId, request));
    }
    @DeleteMapping("/{cardId}/comments/{commentId}")
    @io.swagger.v3.oas.annotations.Operation(summary = "여행 카드 댓글 삭제")
    public ApiResponse<Void> deleteComment(@PathVariable Long cardId, @PathVariable Long commentId) {
        service.deleteComment(security.getCurrentMemberId(), cardId, commentId); return ApiResponse.ok();
    }
    @GetMapping("/copy-targets")
    @io.swagger.v3.oas.annotations.Operation(summary = "일정 복사 대상 여행방 조회")
    public ApiResponse<List<CopyTargetResponse>> getCopyTargets() {
        return ApiResponse.success(copyService.getTargets(security.getCurrentMemberId()));
    }
    @PostMapping("/{cardId}/itinerary-copy")
    @io.swagger.v3.oas.annotations.Operation(summary = "여행 카드 일정 복사")
    public ApiResponse<Void> copyItinerary(
            @PathVariable Long cardId,
            @Valid @RequestBody CopyItineraryRequest request) {
        copyService.copy(security.getCurrentMemberId(), cardId, request);
        return ApiResponse.ok();
    }
}
