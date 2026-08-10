package back.backend.domain.place.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.lenient;

import back.backend.domain.collaboration.service.CollaborationEventService;
import back.backend.domain.member.entity.AuthProvider;
import back.backend.domain.member.entity.Member;
import back.backend.domain.member.repository.MemberRepository;
import back.backend.domain.place.dto.request.AddMapPinCommentRequest;
import back.backend.domain.place.dto.response.MapPinCommentResponse;
import back.backend.domain.place.dto.response.MapPinSummaryResponse;
import back.backend.domain.place.entity.MapPin;
import back.backend.domain.place.entity.MapPinComment;
import back.backend.domain.place.repository.MapPinCommentRepository;
import back.backend.domain.place.repository.MapPinRepository;
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
class MapPinCommentServiceTest {

    @Mock private MapPinRepository mapPinRepository;
    @Mock private MapPinPersistenceService mapPinPersistenceService;
    @Mock private MapPinCommentRepository commentRepository;
    @Mock private MemberRepository memberRepository;
    @Mock private TripAccessChecker accessChecker;
    @Mock private CollaborationEventService collaborationEventService;

    @InjectMocks private MapPinCommentService mapPinCommentService;

    @BeforeEach
    void setUp() {
        lenient().when(accessChecker.requireView(1L)).thenReturn(1L);
        lenient().when(accessChecker.requireEdit(1L)).thenReturn(1L);
    }

    @Test
    @DisplayName("t1 핀이 없으면 빈 목록을 반환한다")
    void t1_getPinSummariesReturnsEmptyWhenNoPins() {
        given(mapPinRepository.findAllByTripId(1L)).willReturn(List.of());

        List<MapPinSummaryResponse> result = mapPinCommentService.getPinSummaries(1L);

        assertThat(result).isEmpty();
    }

    @Test
    @DisplayName("t2 핀 목록을 댓글 수와 함께 반환한다")
    void t2_getPinSummariesIncludesCommentCount() {
        MapPin pin = pin(10L, "ChIJone", "국밥집");
        given(mapPinRepository.findAllByTripId(1L)).willReturn(List.of(pin));
        given(commentRepository.countByMapPinIds(List.of(10L))).willReturn(List.of(
                projection(10L, 3L)
        ));

        List<MapPinSummaryResponse> result = mapPinCommentService.getPinSummaries(1L);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).googlePlaceId()).isEqualTo("ChIJone");
        assertThat(result.get(0).commentCount()).isEqualTo(3L);
    }

    @Test
    @DisplayName("t3 아직 핀이 없는 장소의 댓글을 조회하면 빈 목록을 반환한다")
    void t3_getCommentsReturnsEmptyWhenPinNotFound() {
        given(mapPinRepository.findByTripIdAndGooglePlaceId(1L, "ChIJnone"))
                .willReturn(Optional.empty());

        List<MapPinCommentResponse> result = mapPinCommentService.getComments(1L, "ChIJnone");

        assertThat(result).isEmpty();
    }

    @Test
    @DisplayName("t4 첫 댓글 등록 시 핀을 새로 만들고 댓글을 저장한다")
    void t4_addCommentCreatesPinWhenNotExists() {
        given(mapPinPersistenceService.findOrCreate(any())).willAnswer(invocation -> {
            MapPin p = invocation.getArgument(0);
            ReflectionTestUtils.setField(p, "id", 20L);
            return p;
        });
        given(commentRepository.save(any())).willAnswer(invocation -> {
            MapPinComment c = invocation.getArgument(0);
            ReflectionTestUtils.setField(c, "id", 200L);
            return c;
        });

        MapPinCommentResponse result = mapPinCommentService.addComment(
                1L, "ChIJnew",
                new AddMapPinCommentRequest("여기 가보고 싶어요", 37.5, 127.0, "새 장소"));

        assertThat(result.id()).isEqualTo(200L);
        assertThat(result.mapPinId()).isEqualTo(20L);
        assertThat(result.content()).isEqualTo("여기 가보고 싶어요");
        then(mapPinPersistenceService).should().findOrCreate(any(MapPin.class));
        then(collaborationEventService).should().record(
                org.mockito.ArgumentMatchers.eq(1L),
                org.mockito.ArgumentMatchers.eq(1L),
                org.mockito.ArgumentMatchers.eq("MAP_PIN_COMMENT_ADDED"),
                org.mockito.ArgumentMatchers.eq("MAP_PIN"),
                org.mockito.ArgumentMatchers.eq(20L),
                any(), any(), any(), any()
        );
    }

    @Test
    @DisplayName("t5 이미 핀이 있으면 새로 만들지 않고 댓글만 추가한다")
    void t5_addCommentReusesExistingPin() {
        MapPin existing = pin(30L, "ChIJexisting", "기존 장소");
        given(mapPinPersistenceService.findOrCreate(any())).willReturn(existing);
        given(commentRepository.save(any())).willAnswer(invocation -> {
            MapPinComment c = invocation.getArgument(0);
            ReflectionTestUtils.setField(c, "id", 201L);
            return c;
        });

        MapPinCommentResponse result = mapPinCommentService.addComment(
                1L, "ChIJexisting",
                new AddMapPinCommentRequest("추가 댓글", 37.5, 127.0, "기존 장소"));

        assertThat(result.mapPinId()).isEqualTo(30L);
        then(mapPinPersistenceService).should().findOrCreate(any(MapPin.class));
    }

    @Test
    @DisplayName("t6 조회 권한이 없는 멤버가 핀 목록을 조회하면 FORBIDDEN 예외가 발생한다")
    void t6_forbiddenMemberCannotGetPinSummaries() {
        given(accessChecker.requireView(1L))
                .willThrow(new BusinessException(CommonErrorCode.FORBIDDEN));

        assertThatThrownBy(() -> mapPinCommentService.getPinSummaries(1L))
                .isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(((BusinessException) e).getErrorCode())
                        .isEqualTo(CommonErrorCode.FORBIDDEN));
    }

    @Test
    @DisplayName("t7 댓글과 장소 이름의 앞뒤 공백을 제거해 저장한다")
    void t7_addCommentNormalizesTextFields() {
        MapPin savedPin = pin(40L, "ChIJnormalized", "장소");
        given(mapPinPersistenceService.findOrCreate(any())).willReturn(savedPin);
        given(commentRepository.save(any())).willAnswer(invocation -> {
            MapPinComment c = invocation.getArgument(0);
            ReflectionTestUtils.setField(c, "id", 202L);
            return c;
        });

        MapPinCommentResponse result = mapPinCommentService.addComment(
                1L, "ChIJnormalized",
                new AddMapPinCommentRequest("  댓글  ", 37.5, 127.0, "  장소  "));

        assertThat(result.mapPinId()).isEqualTo(40L);
        assertThat(result.content()).isEqualTo("댓글");
        then(mapPinPersistenceService).should().findOrCreate(
                org.mockito.ArgumentMatchers.argThat(pin -> pin.getPlaceName().equals("장소"))
        );
    }

    @Test
    @DisplayName("t8 댓글 조회 시 작성자 닉네임과 프로필 이미지를 함께 반환한다")
    void t8_getCommentsIncludesAuthorProfile() {
        MapPin existingPin = pin(50L, "ChIJauthor", "작성자 장소");
        MapPinComment comment = MapPinComment.builder()
                .mapPinId(50L)
                .memberId(2L)
                .content("같이 가요")
                .createdAt(LocalDateTime.of(2026, 8, 10, 12, 0))
                .build();
        Member member = Member.create(
                "member@example.com",
                "여행자",
                "/uploads/profile-images/member.png",
                AuthProvider.KAKAO,
                "provider-2");
        ReflectionTestUtils.setField(member, "id", 2L);
        given(mapPinRepository.findByTripIdAndGooglePlaceId(1L, "ChIJauthor"))
                .willReturn(Optional.of(existingPin));
        given(commentRepository.findAllByMapPinIdOrderByIdAsc(50L))
                .willReturn(List.of(comment));
        given(memberRepository.findAllById(List.of(2L))).willReturn(List.of(member));

        List<MapPinCommentResponse> result = mapPinCommentService.getComments(1L, "ChIJauthor");

        assertThat(result).singleElement().satisfies(response -> {
            assertThat(response.nickname()).isEqualTo("여행자");
            assertThat(response.profileImageUrl()).isEqualTo("/uploads/profile-images/member.png");
        });
    }

    private MapPin pin(Long id, String googlePlaceId, String placeName) {
        MapPin p = MapPin.builder()
                .tripId(1L)
                .googlePlaceId(googlePlaceId)
                .lat(37.5)
                .lng(127.0)
                .placeName(placeName)
                .createdAt(LocalDateTime.now())
                .build();
        ReflectionTestUtils.setField(p, "id", id);
        return p;
    }

    private MapPinCommentRepository.CommentCountProjection projection(Long mapPinId, Long count) {
        return new MapPinCommentRepository.CommentCountProjection() {
            @Override
            public Long getMapPinId() {
                return mapPinId;
            }

            @Override
            public Long getCommentCount() {
                return count;
            }
        };
    }
}
