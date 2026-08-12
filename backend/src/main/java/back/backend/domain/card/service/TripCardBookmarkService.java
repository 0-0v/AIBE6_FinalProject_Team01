package back.backend.domain.card.service;

import back.backend.domain.card.dto.TripSharedBookmarkResponse;
import back.backend.domain.card.entity.TripCardBookmarkShare;
import back.backend.domain.card.repository.TripCardBookmarkShareRepository;
import back.backend.domain.member.repository.MemberRepository;
import back.backend.domain.place.service.TripAccessChecker;
import back.backend.global.security.SecurityContextAccessor;
import back.backend.global.exception.DataIntegrityConstraintMatcher;
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
        return repository.findAllByTripIdOrderBySharedAtDesc(tripId).stream()
                .collect(Collectors.groupingBy(
                        TripCardBookmarkShare::getPlanCardId,
                        LinkedHashMap::new,
                        Collectors.toList()))
                .entrySet().stream()
                .map(entry -> new TripSharedBookmarkResponse(
                        publicCardService.getPublicCard(entry.getKey(), memberId),
                        entry.getValue().stream()
                                .map(TripCardBookmarkShare::getMemberId)
                                .distinct()
                                .map(id -> memberRepository.findById(id)
                                        .map(member -> member.getNickname())
                                        .orElse("알 수 없음"))
                                .toList(),
                        entry.getValue().stream()
                                .anyMatch(share -> memberId.equals(share.getMemberId()))))
                .toList();
    }
}
