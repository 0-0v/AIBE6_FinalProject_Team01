package back.backend.domain.card.service;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import back.backend.domain.card.entity.PlanCard;
import back.backend.domain.card.repository.*;
import back.backend.domain.member.repository.MemberRepository;
import back.backend.domain.trip.entity.TripVisibility;
import back.backend.domain.trip.repository.TripRepository;
import back.backend.global.exception.BusinessException;
import back.backend.global.exception.CommonErrorCode;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.context.ApplicationEventPublisher;

@ExtendWith(MockitoExtension.class)
class PublicCardServiceTest {
    @Mock PlanCardRepository cardRepository;
    @Mock SavedTripRepository savedRepository;
    @Mock CardCommentRepository commentRepository;
    @Mock PlanCardTagRepository cardTagRepository;
    @Mock TripTagRepository tagRepository;
    @Mock TripRepository tripRepository;
    @Mock MemberRepository memberRepository;
    @Mock ApplicationEventPublisher eventPublisher;

    @Test
    @DisplayName("t1 본인이 만든 공개 카드를 북마크하면 권한 예외가 발생한다")
    void t1_bookmarkRejectsOwnCard() {
        PlanCard card = PlanCard.create(10L, "제주 여행", TripVisibility.PUBLIC, 1L);
        ReflectionTestUtils.setField(card, "id", 20L);
        when(cardRepository.findById(20L)).thenReturn(Optional.of(card));
        PublicCardService service = new PublicCardService(
                cardRepository, savedRepository, commentRepository, cardTagRepository,
                tagRepository, tripRepository, memberRepository, eventPublisher);

        assertThatThrownBy(() -> service.bookmark(1L, 20L))
                .isInstanceOfSatisfying(BusinessException.class,
                        exception -> org.assertj.core.api.Assertions.assertThat(exception.getErrorCode())
                                .isEqualTo(CommonErrorCode.FORBIDDEN));
    }
}
