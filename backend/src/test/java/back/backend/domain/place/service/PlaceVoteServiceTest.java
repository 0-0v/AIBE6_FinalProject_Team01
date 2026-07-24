package back.backend.domain.place.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;

import back.backend.domain.place.dto.request.RespondPlaceVoteRequest;
import back.backend.domain.collaboration.service.CollaborationEventService;
import back.backend.domain.place.dto.response.PlaceVoteSummaryResponse;
import back.backend.domain.place.entity.Place;
import back.backend.domain.place.entity.PlaceVoteChoice;
import back.backend.domain.place.entity.PlaceVoteRequest;
import back.backend.domain.place.entity.PlaceVoteResponse;
import back.backend.domain.place.entity.PlaceVoteStatus;
import back.backend.domain.place.entity.TripPlace;
import back.backend.domain.place.entity.TripPlaceStatus;
import back.backend.domain.place.exception.PlaceErrorCode;
import back.backend.domain.place.repository.PlaceVoteRequestRepository;
import back.backend.domain.place.repository.PlaceVoteResponseRepository;
import back.backend.domain.place.repository.TripPlaceRepository;
import back.backend.global.exception.BusinessException;
import back.backend.domain.trip.repository.TripMemberRepository;
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
class PlaceVoteServiceTest {

    @Mock private TripPlaceRepository tripPlaceRepository;
    @Mock private PlaceVoteRequestRepository voteRequestRepository;
    @Mock private PlaceVoteResponseRepository voteResponseRepository;
    @Mock private TripAccessChecker accessChecker;
    @Mock private TripMemberRepository tripMemberRepository;
    @Mock private CollaborationEventService collaborationEventService;

    @InjectMocks private PlaceVoteService placeVoteService;

    private TripPlace candidate;

    @BeforeEach
    void setUp() {
        lenient().when(accessChecker.requireView(1L)).thenReturn(1L);
        lenient().when(accessChecker.requireEdit(1L)).thenReturn(1L);
        candidate = TripPlace.builder()
                .tripId(1L)
                .place(Place.builder().name("성산일출봉").build())
                .addedBy(1L)
                .status(TripPlaceStatus.SAVED)
                .build();
        ReflectionTestUtils.setField(candidate, "id", 10L);
    }

    @Test
    @DisplayName("t1 여행 멤버가 투표를 신청하면 과반수 기준과 만료 시각 및 알림을 생성한다")
    void t1_memberStartsVoteAndNotifiesMembers() {
        given(tripPlaceRepository.findByIdAndTripIdForUpdate(10L, 1L)).willReturn(Optional.of(candidate));
        given(voteRequestRepository.findFirstByTripPlaceIdOrderByIdDesc(10L)).willReturn(Optional.empty());
        given(tripMemberRepository.findMemberIdsByTripId(1L)).willReturn(List.of(1L, 2L, 3L, 4L));
        given(voteRequestRepository.save(any())).willAnswer(invocation -> {
            PlaceVoteRequest request = invocation.getArgument(0);
            ReflectionTestUtils.setField(request, "id", 100L);
            return request;
        });

        PlaceVoteSummaryResponse result = placeVoteService.startVote(1L, 10L);

        assertThat(result.requiredResponseCount()).isEqualTo(3);
        assertThat(result.totalMemberCount()).isEqualTo(4);
        assertThat(result.status()).isEqualTo(PlaceVoteStatus.OPEN);
        assertThat(result.expiresAt()).isNotNull();
        assertThat(result.placeStatus()).isEqualTo(TripPlaceStatus.HOLD);
        assertThat(candidate.getStatus()).isEqualTo(TripPlaceStatus.HOLD);
        then(collaborationEventService).should().record(
                org.mockito.ArgumentMatchers.eq(1L),
                org.mockito.ArgumentMatchers.eq(1L),
                org.mockito.ArgumentMatchers.eq("PLACE_VOTE_STARTED"),
                org.mockito.ArgumentMatchers.eq("TRIP_PLACE"),
                org.mockito.ArgumentMatchers.eq(10L),
                any(),
                any(),
                any(),
                any()
        );
        then(collaborationEventService).should(never()).record(
                org.mockito.ArgumentMatchers.eq(1L),
                org.mockito.ArgumentMatchers.eq(1L),
                org.mockito.ArgumentMatchers.eq("PLACE_VOTE_RESPONDED"),
                org.mockito.ArgumentMatchers.eq("TRIP_PLACE"),
                org.mockito.ArgumentMatchers.eq(10L),
                any(),
                any(),
                any(),
                any()
        );
    }

    @Test
    @DisplayName("t2 찬성이 전체 멤버의 과반수에 도달하면 장소를 확정하고 투표를 종료한다")
    void t2_thirdResponseClosesVote() {
        PlaceVoteRequest voteRequest = openRequest(3, 4);
        given(tripPlaceRepository.findByIdAndTripIdForUpdate(10L, 1L)).willReturn(Optional.of(candidate));
        given(voteRequestRepository.findFirstByTripPlaceIdOrderByIdDesc(10L)).willReturn(Optional.of(voteRequest));
        given(voteRequestRepository.findByIdForUpdate(100L)).willReturn(Optional.of(voteRequest));
        given(voteResponseRepository.findByVoteRequestIdAndMemberId(100L, 1L)).willReturn(Optional.empty());
        given(voteResponseRepository.findAllByVoteRequestId(100L)).willReturn(List.of(
                response(1L, PlaceVoteChoice.AGREE),
                response(2L, PlaceVoteChoice.AGREE),
                response(3L, PlaceVoteChoice.AGREE)
        ));

        PlaceVoteSummaryResponse result = placeVoteService.respond(
                1L, 10L, new RespondPlaceVoteRequest(PlaceVoteChoice.AGREE));

        assertThat(result.status()).isEqualTo(PlaceVoteStatus.CLOSED);
        assertThat(result.agreeCount()).isEqualTo(3);
        assertThat(result.placeStatus()).isEqualTo(TripPlaceStatus.SAVED);
        then(collaborationEventService).should().record(
                org.mockito.ArgumentMatchers.eq(1L),
                org.mockito.ArgumentMatchers.eq(1L),
                org.mockito.ArgumentMatchers.eq("PLACE_VOTE_APPROVED"),
                org.mockito.ArgumentMatchers.eq("TRIP_PLACE"),
                org.mockito.ArgumentMatchers.eq(10L),
                any(),
                any(),
                any(),
                any()
        );
        then(collaborationEventService).should(never()).record(
                org.mockito.ArgumentMatchers.eq(1L),
                org.mockito.ArgumentMatchers.eq(1L),
                org.mockito.ArgumentMatchers.eq("PLACE_VOTE_RESPONDED"),
                org.mockito.ArgumentMatchers.eq("TRIP_PLACE"),
                org.mockito.ArgumentMatchers.eq(10L),
                any(),
                any(),
                any(),
                any()
        );
    }

    @Test
    @DisplayName("t3 전원이 응답했지만 과반 찬성이 없으면 투표를 종료하고 장소를 제거한다")
    void t3_tieRemovesPlace() {
        PlaceVoteRequest voteRequest = openRequest(2, 2);
        given(tripPlaceRepository.findByIdAndTripIdForUpdate(10L, 1L)).willReturn(Optional.of(candidate));
        given(voteRequestRepository.findFirstByTripPlaceIdOrderByIdDesc(10L)).willReturn(Optional.of(voteRequest));
        given(voteRequestRepository.findByIdForUpdate(100L)).willReturn(Optional.of(voteRequest));
        given(voteResponseRepository.findByVoteRequestIdAndMemberId(100L, 1L)).willReturn(Optional.empty());
        given(voteResponseRepository.findAllByVoteRequestId(100L)).willReturn(List.of(
                response(1L, PlaceVoteChoice.DISAGREE),
                response(2L, PlaceVoteChoice.AGREE)
        ));

        PlaceVoteSummaryResponse result = placeVoteService.respond(
                1L, 10L, new RespondPlaceVoteRequest(PlaceVoteChoice.DISAGREE));

        assertThat(result.status()).isEqualTo(PlaceVoteStatus.CLOSED);
        assertThat(result.placeStatus()).isEqualTo(TripPlaceStatus.REJECTED);
        then(tripPlaceRepository).should().delete(candidate);
        then(collaborationEventService).should().record(
                org.mockito.ArgumentMatchers.eq(1L),
                org.mockito.ArgumentMatchers.eq(1L),
                org.mockito.ArgumentMatchers.eq("PLACE_VOTE_REJECTED"),
                org.mockito.ArgumentMatchers.eq("TRIP_PLACE"),
                org.mockito.ArgumentMatchers.eq(10L),
                any(),
                any(),
                any(),
                any()
        );
    }

    @Test
    @DisplayName("t4 반대가 과반수에 도달하면 장소를 탈락 상태로 변경하고 투표를 종료한다")
    void t4_majorityDisagreeRejectsPlace() {
        PlaceVoteRequest voteRequest = openRequest(2, 3);
        given(tripPlaceRepository.findByIdAndTripIdForUpdate(10L, 1L)).willReturn(Optional.of(candidate));
        given(voteRequestRepository.findFirstByTripPlaceIdOrderByIdDesc(10L)).willReturn(Optional.of(voteRequest));
        given(voteRequestRepository.findByIdForUpdate(100L)).willReturn(Optional.of(voteRequest));
        given(voteResponseRepository.findByVoteRequestIdAndMemberId(100L, 1L)).willReturn(Optional.empty());
        given(voteResponseRepository.findAllByVoteRequestId(100L)).willReturn(List.of(
                response(1L, PlaceVoteChoice.DISAGREE),
                response(2L, PlaceVoteChoice.DISAGREE)
        ));

        PlaceVoteSummaryResponse result = placeVoteService.respond(
                1L, 10L, new RespondPlaceVoteRequest(PlaceVoteChoice.DISAGREE));

        assertThat(result.status()).isEqualTo(PlaceVoteStatus.CLOSED);
        assertThat(result.placeStatus()).isEqualTo(TripPlaceStatus.REJECTED);
        then(tripPlaceRepository).should().delete(candidate);
    }

    @Test
    @DisplayName("t5 종료된 투표에는 응답할 수 없다")
    void t5_cannotRespondToClosedVote() {
        PlaceVoteRequest voteRequest = openRequest(2, 2);
        voteRequest.close(java.time.LocalDateTime.now());
        given(tripPlaceRepository.findByIdAndTripIdForUpdate(10L, 1L)).willReturn(Optional.of(candidate));
        given(voteRequestRepository.findFirstByTripPlaceIdOrderByIdDesc(10L)).willReturn(Optional.of(voteRequest));
        given(voteRequestRepository.findByIdForUpdate(100L)).willReturn(Optional.of(voteRequest));

        assertThatThrownBy(() -> placeVoteService.respond(
                1L, 10L, new RespondPlaceVoteRequest(PlaceVoteChoice.AGREE)))
                .isInstanceOf(BusinessException.class)
                .satisfies(exception -> assertThat(((BusinessException) exception).getErrorCode())
                        .isEqualTo(PlaceErrorCode.PLACE_VOTE_CLOSED));
    }

    @Test
    @DisplayName("t6 이전 투표가 종료됐으면 같은 장소에 새 투표를 신청할 수 있다")
    void t6_closedVoteCanBeRequestedAgain() {
        PlaceVoteRequest closedRequest = openRequest(2, 2);
        closedRequest.close(java.time.LocalDateTime.now());
        given(tripPlaceRepository.findByIdAndTripIdForUpdate(10L, 1L)).willReturn(Optional.of(candidate));
        given(voteRequestRepository.findFirstByTripPlaceIdOrderByIdDesc(10L))
                .willReturn(Optional.of(closedRequest));
        given(tripMemberRepository.findMemberIdsByTripId(1L)).willReturn(List.of(1L, 2L));
        given(voteRequestRepository.save(any())).willAnswer(invocation -> {
            PlaceVoteRequest request = invocation.getArgument(0);
            ReflectionTestUtils.setField(request, "id", 101L);
            return request;
        });

        PlaceVoteSummaryResponse result = placeVoteService.startVote(1L, 10L);

        assertThat(result.voteRequestId()).isEqualTo(101L);
        assertThat(result.status()).isEqualTo(PlaceVoteStatus.OPEN);
    }

    @Test
    @DisplayName("t7 투표 목록은 응답을 한 번에 조회해 장소별 최신 결과를 집계한다")
    void t7_getVotesUsesBatchResponses() {
        PlaceVoteRequest first = openRequest(3, 4);
        PlaceVoteRequest second = PlaceVoteRequest.builder()
                .tripPlaceId(20L)
                .createdBy(2L)
                .status(PlaceVoteStatus.CLOSED)
                .requiredResponseCount(2)
                .totalMemberCount(2)
                .createdAt(java.time.LocalDateTime.now())
                .expiresAt(java.time.LocalDateTime.now().plusHours(24))
                .build();
        ReflectionTestUtils.setField(second, "id", 200L);
        TripPlace secondPlace = TripPlace.builder()
                .tripId(1L)
                .place(Place.builder().name("협재해수욕장").build())
                .addedBy(2L)
                .status(TripPlaceStatus.HOLD)
                .build();
        ReflectionTestUtils.setField(secondPlace, "id", 20L);
        given(tripPlaceRepository.findAllOrderedByTripId(1L))
                .willReturn(List.of(candidate, secondPlace));
        given(voteRequestRepository.findLatestByTripPlaceIdIn(List.of(10L, 20L)))
                .willReturn(List.of(first, second));
        given(voteResponseRepository.findAllByVoteRequestIdIn(List.of(100L, 200L)))
                .willReturn(List.of(
                        response(1L, PlaceVoteChoice.AGREE),
                        PlaceVoteResponse.builder()
                                .voteRequestId(200L)
                                .memberId(2L)
                                .choice(PlaceVoteChoice.DISAGREE)
                                .createdAt(java.time.LocalDateTime.now())
                                .updatedAt(java.time.LocalDateTime.now())
                                .build()
                ));

        List<PlaceVoteSummaryResponse> result = placeVoteService.getVotes(1L);

        assertThat(result).hasSize(2);
        assertThat(result).filteredOn(summary -> summary.tripPlaceId().equals(10L))
                .singleElement().extracting(PlaceVoteSummaryResponse::agreeCount).isEqualTo(1);
        then(voteResponseRepository).should()
                .findAllByVoteRequestIdIn(List.of(100L, 200L));
    }

    @Test
    @DisplayName("t8 만료된 투표에 응답하면 응답을 저장하지 않고 장소를 탈락 상태로 변경한다")
    void t8_expiredVoteClosesAsRejectedWithoutSavingResponse() {
        PlaceVoteRequest voteRequest = openRequest(2, 3);
        ReflectionTestUtils.setField(
                voteRequest, "expiresAt", java.time.LocalDateTime.now().minusMinutes(1));
        given(tripPlaceRepository.findByIdAndTripIdForUpdate(10L, 1L))
                .willReturn(Optional.of(candidate));
        given(voteRequestRepository.findFirstByTripPlaceIdOrderByIdDesc(10L))
                .willReturn(Optional.of(voteRequest));
        given(voteRequestRepository.findByIdForUpdate(100L)).willReturn(Optional.of(voteRequest));
        given(voteResponseRepository.findAllByVoteRequestId(100L)).willReturn(List.of());

        PlaceVoteSummaryResponse result = placeVoteService.respond(
                1L, 10L, new RespondPlaceVoteRequest(PlaceVoteChoice.AGREE));

        assertThat(result.status()).isEqualTo(PlaceVoteStatus.CLOSED);
        assertThat(result.placeStatus()).isEqualTo(TripPlaceStatus.REJECTED);
        then(tripPlaceRepository).should().delete(candidate);
        then(voteResponseRepository).should(never()).saveAndFlush(any());
        then(collaborationEventService).should().record(
                org.mockito.ArgumentMatchers.eq(1L),
                org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.eq("PLACE_VOTE_EXPIRED"),
                org.mockito.ArgumentMatchers.eq("TRIP_PLACE"),
                org.mockito.ArgumentMatchers.eq(10L),
                any(),
                any(),
                any(),
                any()
        );
    }

    private PlaceVoteRequest openRequest(int requiredCount, int totalCount) {
        PlaceVoteRequest request = PlaceVoteRequest.builder()
                .tripPlaceId(10L)
                .createdBy(2L)
                .status(PlaceVoteStatus.OPEN)
                .requiredResponseCount(requiredCount)
                .totalMemberCount(totalCount)
                .createdAt(java.time.LocalDateTime.now())
                .expiresAt(java.time.LocalDateTime.now().plusHours(24))
                .build();
        ReflectionTestUtils.setField(request, "id", 100L);
        return request;
    }

    private PlaceVoteResponse response(Long memberId, PlaceVoteChoice choice) {
        return PlaceVoteResponse.builder()
                .voteRequestId(100L)
                .memberId(memberId)
                .choice(choice)
                .createdAt(java.time.LocalDateTime.now())
                .updatedAt(java.time.LocalDateTime.now())
                .build();
    }
}
