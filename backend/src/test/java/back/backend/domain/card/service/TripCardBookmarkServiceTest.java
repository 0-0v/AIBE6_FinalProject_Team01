package back.backend.domain.card.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

import back.backend.domain.card.dto.PublicCardResponse;
import back.backend.domain.card.entity.TripCardBookmarkShare;
import back.backend.domain.card.repository.TripCardBookmarkShareRepository;
import back.backend.domain.member.entity.Member;
import back.backend.domain.member.repository.MemberRepository;
import back.backend.domain.place.service.TripAccessChecker;
import back.backend.global.security.SecurityContextAccessor;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class TripCardBookmarkServiceTest {
    @Mock TripCardBookmarkShareRepository repository;
    @Mock PublicCardService publicCardService;
    @Mock MemberRepository memberRepository;
    @Mock TripAccessChecker accessChecker;
    @Mock SecurityContextAccessor security;

    @Test
    @DisplayName("t1 같은 사용자가 이미 공유한 카드는 중복 저장하지 않는다")
    void t1_duplicateShareIsIdempotent() {
        var service = service();
        given(security.getCurrentMemberId()).willReturn(3L);
        given(repository.existsByTripIdAndPlanCardIdAndMemberId(1L, 2L, 3L)).willReturn(true);

        service.share(1L, 2L);

        then(repository).should(org.mockito.Mockito.never()).saveAndFlush(org.mockito.ArgumentMatchers.any());
    }

    @Test
    @DisplayName("t2 여러 사용자가 같은 카드를 공유하면 카드 하나와 공유자 목록을 반환한다")
    void t2_sameCardSharesAreGroupedWithSharers() {
        var service = service();
        given(security.getCurrentMemberId()).willReturn(3L);
        given(repository.findAllByTripIdOrderBySharedAtDesc(1L)).willReturn(List.of(
                TripCardBookmarkShare.create(1L, 2L, 3L),
                TripCardBookmarkShare.create(1L, 2L, 4L)));
        given(publicCardService.getPublicCard(2L, 3L)).willReturn(card());
        Member first = org.mockito.Mockito.mock(Member.class);
        Member second = org.mockito.Mockito.mock(Member.class);
        given(first.getNickname()).willReturn("민수");
        given(second.getNickname()).willReturn("영희");
        given(memberRepository.findById(3L)).willReturn(Optional.of(first));
        given(memberRepository.findById(4L)).willReturn(Optional.of(second));

        var result = service.getShared(1L);

        assertThat(result).hasSize(1);
        assertThat(result.getFirst().sharerNicknames()).containsExactly("민수", "영희");
        assertThat(result.getFirst().sharedByMe()).isTrue();
    }

    @Test
    @DisplayName("t3 공유 해제는 현재 사용자의 공유 기록만 삭제한다")
    void t3_unshareDeletesOnlyCurrentMembersShare() {
        var service = service();
        given(security.getCurrentMemberId()).willReturn(3L);

        service.unshare(1L, 2L);

        then(accessChecker).should().requireView(1L);
        then(repository).should()
                .deleteByTripIdAndPlanCardIdAndMemberId(1L, 2L, 3L);
    }

    private TripCardBookmarkService service() {
        return new TripCardBookmarkService(repository, publicCardService, memberRepository, accessChecker, security);
    }

    private PublicCardResponse card() {
        return new PublicCardResponse(2L, 5L, 6L, "작성자", "제주", null, "제주", null,
                Set.of(), List.of(), 1, 0, true, false, LocalDateTime.now());
    }
}
