package back.backend.domain.card.controller;

import back.backend.domain.card.dto.*;
import back.backend.domain.card.service.PublicCardService;
import back.backend.global.response.ApiResponse;
import back.backend.global.security.SecurityContextAccessor;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/cards")
public class PublicCardController {
    private final PublicCardService service;
    private final SecurityContextAccessor security;
    public PublicCardController(PublicCardService service, SecurityContextAccessor security) {
        this.service = service; this.security = security;
    }
    @GetMapping("/public")
    public ApiResponse<PublicCardPageResponse> getPublicCards(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "9") int size,
            @RequestParam(defaultValue = "LATEST") CardSort sort,
            @RequestParam(required = false) String query) {
        Long memberId = security.getCurrentPrincipal().map(principal -> principal.getMemberId()).orElse(null);
        return ApiResponse.success(service.getPublicCards(memberId, page, size, sort, query));
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
}
