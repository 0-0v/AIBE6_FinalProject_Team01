package back.backend.domain.card.service;

import back.backend.domain.card.dto.*;
import back.backend.domain.card.entity.*;
import back.backend.domain.card.repository.*;
import back.backend.domain.member.repository.MemberRepository;
import back.backend.domain.trip.entity.TripVisibility;
import back.backend.domain.trip.repository.TripRepository;
import back.backend.global.exception.BusinessException;
import back.backend.global.exception.CommonErrorCode;
import back.backend.global.realtime.RealtimeEvent;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class PublicCardService {
    private final PlanCardRepository cardRepository;
    private final SavedTripRepository savedRepository;
    private final CardCommentRepository commentRepository;
    private final PlanCardTagRepository cardTagRepository;
    private final TripTagRepository tagRepository;
    private final TripRepository tripRepository;
    private final MemberRepository memberRepository;
    private final ApplicationEventPublisher eventPublisher;

    public PublicCardService(PlanCardRepository cardRepository, SavedTripRepository savedRepository,
            CardCommentRepository commentRepository, PlanCardTagRepository cardTagRepository,
            TripTagRepository tagRepository, TripRepository tripRepository, MemberRepository memberRepository,
            ApplicationEventPublisher eventPublisher) {
        this.cardRepository = cardRepository; this.savedRepository = savedRepository;
        this.commentRepository = commentRepository; this.cardTagRepository = cardTagRepository;
        this.tagRepository = tagRepository; this.tripRepository = tripRepository; this.memberRepository = memberRepository;
        this.eventPublisher = eventPublisher;
    }

    public PublicCardPageResponse getPublicCards(Long memberId, int page, int size, CardSort sort, String query) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 50);
        String keyword = query == null ? "" : query.trim().toLowerCase();
        List<PublicCardResponse> cards = cardRepository.findAllByVisibility(TripVisibility.PUBLIC).stream()
                .map(card -> toResponse(card, memberId))
                .filter(card -> keyword.isEmpty() || matches(card, keyword))
                .sorted(comparator(sort))
                .toList();
        int from = Math.min(safePage * safeSize, cards.size());
        int to = Math.min(from + safeSize, cards.size());
        return new PublicCardPageResponse(cards.subList(from, to), safePage, safeSize, cards.size(),
                (int) Math.ceil((double) cards.size() / safeSize));
    }

    public List<PublicCardResponse> getBookmarks(Long memberId) {
        return savedRepository.findAllByMemberIdOrderByIdDesc(memberId).stream()
                .map(saved -> cardRepository.findByTripId(saved.getTripId()).orElse(null))
                .filter(Objects::nonNull)
                .filter(card -> card.getVisibility() == TripVisibility.PUBLIC)
                .map(card -> toResponse(card, memberId)).toList();
    }

    @Transactional
    public void bookmark(Long memberId, Long cardId) {
        PlanCard card = requirePublic(cardId);
        if (card.getCreatedBy().equals(memberId)) throw new BusinessException(CommonErrorCode.FORBIDDEN);
        if (savedRepository.findByMemberIdAndTripId(memberId, card.getTripId()).isEmpty()) {
            savedRepository.save(SavedTrip.create(memberId, card.getTripId()));
            eventPublisher.publishEvent(RealtimeEvent.publicCard(cardId));
        }
    }

    @Transactional
    public void removeBookmark(Long memberId, Long cardId) {
        PlanCard card = requirePublic(cardId);
        savedRepository.findByMemberIdAndTripId(memberId, card.getTripId()).ifPresent(savedRepository::delete);
        eventPublisher.publishEvent(RealtimeEvent.publicCard(cardId));
    }

    public List<CardCommentResponse> getComments(Long cardId, Long memberId) {
        requirePublic(cardId);
        return commentRepository.findAllByPlanCardIdOrderByCreatedAtAsc(cardId).stream()
                .map(comment -> toComment(comment, memberId)).toList();
    }

    @Transactional
    public CardCommentResponse addComment(Long memberId, Long cardId, CardCommentRequest request) {
        requirePublic(cardId);
        CardCommentResponse response = toComment(
                commentRepository.save(CardComment.create(cardId, memberId, request.content())), memberId);
        eventPublisher.publishEvent(RealtimeEvent.publicCard(cardId));
        return response;
    }

    @Transactional
    public void deleteComment(Long memberId, Long cardId, Long commentId) {
        requirePublic(cardId);
        CardComment comment = commentRepository.findByIdAndMemberId(commentId, memberId)
                .filter(item -> item.getPlanCardId().equals(cardId))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.NOT_FOUND));
        commentRepository.delete(comment);
        eventPublisher.publishEvent(RealtimeEvent.publicCard(cardId));
    }

    private PlanCard requirePublic(Long cardId) {
        return cardRepository.findById(cardId)
                .filter(card -> card.getVisibility() == TripVisibility.PUBLIC)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.NOT_FOUND));
    }
    private boolean matches(PublicCardResponse card, String keyword) {
        return card.title().toLowerCase().contains(keyword)
                || card.authorNickname().toLowerCase().contains(keyword)
                || card.tags().stream().anyMatch(tag -> tag.toLowerCase().contains(keyword));
    }
    private Comparator<PublicCardResponse> comparator(CardSort sort) {
        return switch (sort == null ? CardSort.LATEST : sort) {
            case POPULAR -> Comparator.comparingLong(PublicCardResponse::bookmarkCount).reversed()
                    .thenComparing(PublicCardResponse::createdAt, Comparator.reverseOrder());
            case COMMENTS -> Comparator.comparingLong(PublicCardResponse::commentCount).reversed()
                    .thenComparing(PublicCardResponse::createdAt, Comparator.reverseOrder());
            case LATEST -> Comparator.comparing(PublicCardResponse::createdAt, Comparator.reverseOrder());
        };
    }
    private PublicCardResponse toResponse(PlanCard card, Long memberId) {
        var trip = tripRepository.findById(card.getTripId())
                .orElseThrow(() -> new BusinessException(CommonErrorCode.NOT_FOUND));
        String author = memberRepository.findById(card.getCreatedBy()).map(member -> member.getNickname()).orElse("알 수 없음");
        List<String> tags = cardTagRepository.findAllByPlanCardId(card.getId()).stream()
                .map(PlanCardTag::getTagId).map(tagRepository::findById).flatMap(Optional::stream)
                .map(TripTag::getName).toList();
        boolean bookmarked = memberId != null
                && savedRepository.findByMemberIdAndTripId(memberId, card.getTripId()).isPresent();
        return new PublicCardResponse(card.getId(), card.getTripId(), card.getCreatedBy(), author, card.getTitle(),
                card.getSummary(), trip.getDestination(), card.getCoverImageUrl() != null
                ? card.getCoverImageUrl() : trip.getCoverImageUrl(), tags,
                savedRepository.countByTripId(card.getTripId()), commentRepository.countByPlanCardId(card.getId()),
                bookmarked, memberId != null && card.getCreatedBy().equals(memberId), card.getCreatedAt());
    }
    private CardCommentResponse toComment(CardComment comment, Long memberId) {
        String nickname = memberRepository.findById(comment.getMemberId()).map(member -> member.getNickname()).orElse("알 수 없음");
        return new CardCommentResponse(comment.getId(), comment.getMemberId(), nickname, comment.getContent(),
                memberId != null && memberId.equals(comment.getMemberId()), comment.getCreatedAt());
    }
}
