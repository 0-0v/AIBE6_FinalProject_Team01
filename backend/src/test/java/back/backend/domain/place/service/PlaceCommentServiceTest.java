package back.backend.domain.place.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.lenient;

import back.backend.domain.place.dto.request.AddPlaceCommentRequest;
import back.backend.domain.collaboration.service.CollaborationEventService;
import back.backend.domain.place.dto.response.PlaceCommentResponse;
import back.backend.domain.place.entity.Place;
import back.backend.domain.place.entity.PlaceComment;
import back.backend.domain.place.entity.TripPlace;
import back.backend.domain.place.entity.TripPlaceStatus;
import back.backend.domain.place.exception.PlaceErrorCode;
import back.backend.domain.place.repository.PlaceCommentRepository;
import back.backend.domain.place.repository.TripPlaceRepository;
import back.backend.global.exception.BusinessException;
import back.backend.global.exception.CommonErrorCode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class PlaceCommentServiceTest {

    @Mock private TripPlaceRepository tripPlaceRepository;
    @Mock private PlaceCommentRepository commentRepository;
    @Mock private TripAccessChecker accessChecker;
    @Mock private CollaborationEventService collaborationEventService;

    @InjectMocks private PlaceCommentService commentService;

    private TripPlace tripPlace;

    @BeforeEach
    void setUp() {
        lenient().when(accessChecker.requireView(1L)).thenReturn(1L);
        lenient().when(accessChecker.requireEdit(1L)).thenReturn(1L);
        tripPlace = TripPlace.builder()
                .tripId(1L)
                .place(Place.builder().name("성산일출봉").build())
                .addedBy(1L)
                .status(TripPlaceStatus.SAVED)
                .build();
        ReflectionTestUtils.setField(tripPlace, "id", 10L);
        lenient().when(tripPlaceRepository.findByIdAndTripId(10L, 1L)).thenReturn(Optional.of(tripPlace));
    }

    @Test
    @DisplayName("t1 여행 장소의 댓글 목록을 등록순으로 조회한다")
    void t1_getCommentsInOrder() {
        given(commentRepository.findAllByTripPlaceIdOrderByIdAsc(10L)).willReturn(List.of(
                comment(100L, 1L, "좋아요!"),
                comment(101L, 2L, "저도 가고 싶어요")
        ));

        List<PlaceCommentResponse> result = commentService.getComments(1L, 10L);

        assertThat(result).hasSize(2);
        assertThat(result.get(0).content()).isEqualTo("좋아요!");
        assertThat(result.get(1).content()).isEqualTo("저도 가고 싶어요");
    }

    @Test
    @DisplayName("t2 댓글을 등록하면 저장 후 응답을 반환한다")
    void t2_addCommentSavesAndReturns() {
        given(commentRepository.save(any())).willAnswer(invocation -> {
            PlaceComment c = invocation.getArgument(0);
            ReflectionTestUtils.setField(c, "id", 200L);
            return c;
        });

        PlaceCommentResponse result = commentService.addComment(
                1L, 10L, new AddPlaceCommentRequest("맛있는 곳이에요"));

        assertThat(result.id()).isEqualTo(200L);
        assertThat(result.memberId()).isEqualTo(1L);
        assertThat(result.content()).isEqualTo("맛있는 곳이에요");
        then(commentRepository).should().save(any(PlaceComment.class));
        then(collaborationEventService).should().record(
                org.mockito.ArgumentMatchers.eq(1L),
                org.mockito.ArgumentMatchers.eq(1L),
                org.mockito.ArgumentMatchers.eq("PLACE_COMMENT_ADDED"),
                org.mockito.ArgumentMatchers.eq("TRIP_PLACE"),
                org.mockito.ArgumentMatchers.eq(10L),
                any(),
                any(),
                any(),
                any()
        );
    }

    @Test
    @DisplayName("t3 본인 댓글을 삭제하면 레포지토리의 delete가 호출된다")
    void t3_deleteOwnComment() {
        PlaceComment myComment = comment(300L, 1L, "삭제할 댓글");
        given(commentRepository.findByIdAndMemberId(300L, 1L)).willReturn(Optional.of(myComment));

        commentService.deleteComment(1L, 10L, 300L);

        then(commentRepository).should().delete(myComment);
        then(collaborationEventService).should().record(
                org.mockito.ArgumentMatchers.eq(1L),
                org.mockito.ArgumentMatchers.eq(1L),
                org.mockito.ArgumentMatchers.eq("PLACE_COMMENT_DELETED"),
                org.mockito.ArgumentMatchers.eq("TRIP_PLACE"),
                org.mockito.ArgumentMatchers.eq(10L),
                any(),
                any(),
                any(),
                any()
        );
    }

    @Test
    @DisplayName("t4 다른 멤버의 댓글을 삭제하면 PLACE_COMMENT_NOT_FOUND 예외가 발생한다")
    void t4_cannotDeleteOtherMemberComment() {
        given(commentRepository.findByIdAndMemberId(400L, 1L)).willReturn(Optional.empty());

        assertThatThrownBy(() -> commentService.deleteComment(1L, 10L, 400L))
                .isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(((BusinessException) e).getErrorCode())
                        .isEqualTo(PlaceErrorCode.PLACE_COMMENT_NOT_FOUND));
    }

    @Test
    @DisplayName("t5 조회 권한이 없는 멤버가 댓글을 조회하면 FORBIDDEN 예외가 발생한다")
    void t5_forbiddenMemberCannotGetComments() {
        given(accessChecker.requireView(1L))
                .willThrow(new BusinessException(CommonErrorCode.FORBIDDEN));

        assertThatThrownBy(() -> commentService.getComments(1L, 10L))
                .isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(((BusinessException) e).getErrorCode())
                        .isEqualTo(CommonErrorCode.FORBIDDEN));
    }

    @Test
    @DisplayName("t6 존재하지 않는 여행 장소에 댓글을 등록하면 TRIP_PLACE_NOT_FOUND 예외가 발생한다")
    void t6_addCommentToNonExistentTripPlace() {
        given(tripPlaceRepository.findByIdAndTripId(99L, 1L)).willReturn(Optional.empty());

        assertThatThrownBy(() -> commentService.addComment(
                1L, 99L, new AddPlaceCommentRequest("댓글")))
                .isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(((BusinessException) e).getErrorCode())
                        .isEqualTo(PlaceErrorCode.TRIP_PLACE_NOT_FOUND));
    }

    private PlaceComment comment(Long id, Long memberId, String content) {
        PlaceComment c = PlaceComment.builder()
                .tripPlaceId(10L)
                .memberId(memberId)
                .content(content)
                .createdAt(LocalDateTime.now())
                .build();
        ReflectionTestUtils.setField(c, "id", id);
        return c;
    }
}
