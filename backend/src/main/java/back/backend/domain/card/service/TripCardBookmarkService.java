package back.backend.domain.card.service;

import back.backend.domain.card.dto.TripSharedBookmarkResponse;
import back.backend.domain.card.entity.TripCardBookmarkShare;
import back.backend.domain.card.repository.TripCardBookmarkShareRepository;
import back.backend.domain.member.repository.MemberRepository;
import back.backend.domain.place.service.TripAccessChecker;
import back.backend.global.security.SecurityContextAccessor;
import back.backend.global.exception.DataIntegrityConstraintMatcher;
import back.backend.global.response.PageResponse;
import java.util.*;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TripCardBookmarkService {
    private final TripCardBookmarkShareRepository repository;
    private final PublicCardService publicCardService;
    private final MemberRepository memberRepository;
    private final TripAccessChecker accessChecker;
    private final SecurityContextAccessor security;

    @Transactional
    public void share(Long tripId, Long cardId) {
        accessChecker.requireView(tripId);
        Long memberId = security.getCurrentMemberId();
        publicCardService.getPublicCard(cardId, memberId);
        if (repository.existsByTripIdAndPlanCardIdAndMemberId(tripId, cardId, memberId)) return;
        try {
            repository.saveAndFlush(TripCardBookmarkShare.create(tripId, cardId, memberId));
        } catch (DataIntegrityViolationException exception) {
            if (!DataIntegrityConstraintMatcher.containsConstraint(
                    exception, "uk_trip_card_bookmark_shares_trip_card_member")) {
                throw exception;
            }
        }
    }

    @Transactional
    public void unshare(Long tripId, Long cardId) {
        accessChecker.requireView(tripId);
        repository.deleteByTripIdAndPlanCardIdAndMemberId(
                tripId, cardId, security.getCurrentMemberId());
    }

    public List<TripSharedBookmarkResponse> getShared(Long tripId) {
        accessChecker.requireView(tripId);
        Long memberId = security.getCurrentMemberId();
        LinkedHashMap<Long, List<TripCardBookmarkShare>> sharesByCard = repository
                .findAllByTripIdOrderBySharedAtDesc(tripId).stream()
                .collect(Collectors.groupingBy(
                        TripCardBookmarkShare::getPlanCardId,
                        LinkedHashMap::new,
                        Collectors.toList()));
        Map<Long, back.backend.domain.card.dto.PublicCardResponse> cardsById =
                publicCardService.getPublicCards(sharesByCard.keySet(), memberId);
        Set<Long> sharerIds = sharesByCard.values().stream()
                .flatMap(Collection::stream)
                .map(TripCardBookmarkShare::getMemberId)
                .collect(Collectors.toSet());
        Map<Long, String> nicknamesByMemberId = memberRepository.findAllById(sharerIds).stream()
                .collect(Collectors.toMap(
                        back.backend.domain.member.entity.Member::getId,
                        back.backend.domain.member.entity.Member::getNickname
                ));

        return sharesByCard.entrySet().stream()
                .filter(entry -> cardsById.containsKey(entry.getKey()))
                .map(entry -> new TripSharedBookmarkResponse(
                        cardsById.get(entry.getKey()),
                        entry.getValue().stream()
                                .map(TripCardBookmarkShare::getMemberId)
                                .distinct()
                                .map(id -> nicknamesByMemberId.getOrDefault(id, "알 수 없음"))
                                .toList(),
                        entry.getValue().stream()
                                .anyMatch(share -> memberId.equals(share.getMemberId()))))
                .toList();
    }

    public PageResponse<TripSharedBookmarkResponse> getShared(Long tripId, int page, int size) {
        List<TripSharedBookmarkResponse> items = getShared(tripId);
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 100);
        int from = Math.min(safePage * safeSize, items.size());
        int to = Math.min(from + safeSize, items.size());
        int totalPages = (int) Math.ceil((double) items.size() / safeSize);
        return new PageResponse<>(
                items.subList(from, to), safePage, safeSize, items.size(), totalPages,
                safePage == 0, safePage + 1 >= totalPages, items.isEmpty()
        );
    }
}
