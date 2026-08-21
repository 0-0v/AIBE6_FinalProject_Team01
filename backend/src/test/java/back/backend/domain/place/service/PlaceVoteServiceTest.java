package back.backend.domain.place.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

import back.backend.domain.collaboration.service.CollaborationEventService;
import back.backend.domain.place.dto.request.CreatePlaceVoteRequest;
import back.backend.domain.place.dto.request.RespondPlaceVoteRequest;
import back.backend.domain.place.entity.*;
import back.backend.domain.place.repository.*;
import back.backend.domain.trip.repository.TripMemberRepository;
import back.backend.global.exception.BusinessException;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class PlaceVoteServiceTest {
    @Mock TripPlaceRepository tripPlaceRepository;
    @Mock PlaceVoteRequestRepository voteRequestRepository;
    @Mock PlaceVoteResponseRepository voteResponseRepository;
    @Mock TripAccessChecker accessChecker;
    @Mock TripMemberRepository tripMemberRepository;
    @Mock CollaborationEventService collaborationEventService;
    @Mock PlaceVoteAiInfoService aiInfoService;
    PlaceVoteService service;
    TripPlace first;
    TripPlace second;

    @BeforeEach void setUp() {
        service = new PlaceVoteService(tripPlaceRepository, voteRequestRepository, voteResponseRepository,
                accessChecker, tripMemberRepository, collaborationEventService, aiInfoService);
        first = place(10L, "을지맥옥"); second = place(20L, "맥파이");
        org.mockito.Mockito.lenient().when(accessChecker.requireEdit(1L)).thenReturn(1L);
        org.mockito.Mockito.lenient().when(accessChecker.requireView(1L)).thenReturn(1L);
    }

    @Test
    @DisplayName("t1 A/B 투표를 만들면 두 장소와 선택 제목을 저장한다")
    void t1_createBattleVoteStoresBothPlacesAndTitle() {
        given(tripPlaceRepository.findAllByIdsAndTripIdForUpdate(List.of(10L, 20L), 1L))
                .willReturn(List.of(first, second));
        given(tripMemberRepository.findMemberIdsByTripId(1L)).willReturn(List.of(1L, 2L, 3L));
        given(aiInfoService.generate(any(), any())).willReturn(new PlaceVoteAiInfoService.VoteAiInfo("A 정보", "B 정보", "비교"));
        given(voteRequestRepository.save(any())).willAnswer(invocation -> { PlaceVoteRequest vote = invocation.getArgument(0); ReflectionTestUtils.setField(vote, "id", 100L); return vote; });

        var result = service.startVote(1L, new CreatePlaceVoteRequest(PlaceVoteType.PLACE_BATTLE, 10L, 20L, "가까운 곳 골라주세요"));

        assertThat(result.type()).isEqualTo(PlaceVoteType.PLACE_BATTLE);
        assertThat(result.primaryPlace().name()).isEqualTo("을지맥옥");
        assertThat(result.secondaryPlace().name()).isEqualTo("맥파이");
        assertThat(first.getStatus()).isEqualTo(TripPlaceStatus.SAVED);
        assertThat(second.getStatus()).isEqualTo(TripPlaceStatus.SAVED);
        assertThat(first.getAddedBy()).isEqualTo(11L);
        assertThat(second.getAddedBy()).isEqualTo(11L);
        then(collaborationEventService).should().record(
                org.mockito.ArgumentMatchers.eq(1L), org.mockito.ArgumentMatchers.eq(1L),
                org.mockito.ArgumentMatchers.eq("PLACE_VOTE_STARTED"),
                org.mockito.ArgumentMatchers.eq("PLACE_VOTE"), org.mockito.ArgumentMatchers.eq(100L),
                any(), any(), any(), any());
    }

    @Test
    @DisplayName("t2 A/B 투표 종료 시 승자를 기록하되 장소 상태는 변경하지 않는다")
    void t2_battleResultDoesNotChangePlaceStatus() {
        PlaceVoteRequest vote = vote(PlaceVoteType.PLACE_BATTLE, 20L);
        given(voteRequestRepository.findByIdForUpdate(100L)).willReturn(Optional.of(vote));
        given(tripPlaceRepository.findByIdAndTripIdForUpdate(10L, 1L)).willReturn(Optional.of(first));
        given(tripPlaceRepository.findByIdAndTripIdForUpdate(20L, 1L)).willReturn(Optional.of(second));
        given(voteResponseRepository.findByVoteRequestIdAndMemberId(100L, 1L)).willReturn(Optional.empty());
        given(voteResponseRepository.findAllByVoteRequestId(100L)).willReturn(List.of(response(1L, PlaceVoteChoice.OPTION_A), response(2L, PlaceVoteChoice.OPTION_A)));

        var result = service.respondByVoteId(1L, 100L, new RespondPlaceVoteRequest(PlaceVoteChoice.OPTION_A));

        assertThat(result.status()).isEqualTo(PlaceVoteStatus.CLOSED);
        assertThat(result.winnerTripPlaceId()).isEqualTo(10L);
        assertThat(first.getStatus()).isEqualTo(TripPlaceStatus.SAVED);
        assertThat(second.getStatus()).isEqualTo(TripPlaceStatus.SAVED);
        assertThat(first.getAddedBy()).isEqualTo(11L);
        assertThat(second.getAddedBy()).isEqualTo(11L);
    }

    @Test
    @DisplayName("t3 찬반 투표에서 찬반 동률이면 미선정으로 종료한다")
    void t3_approvalTieEndsAsNotSelected() {
        PlaceVoteRequest vote = vote(PlaceVoteType.PLACE_APPROVAL, null);
        given(voteRequestRepository.findByIdForUpdate(100L)).willReturn(Optional.of(vote));
        given(tripPlaceRepository.findByIdAndTripIdForUpdate(10L, 1L)).willReturn(Optional.of(first));
        given(voteResponseRepository.findByVoteRequestIdAndMemberId(100L, 1L)).willReturn(Optional.empty());
        given(voteResponseRepository.findAllByVoteRequestId(100L)).willReturn(List.of(response(1L, PlaceVoteChoice.DISAGREE), response(2L, PlaceVoteChoice.AGREE)));

        var result = service.respondByVoteId(1L, 100L, new RespondPlaceVoteRequest(PlaceVoteChoice.DISAGREE));

        assertThat(result.result()).isEqualTo(PlaceVoteResult.NOT_SELECTED);
        assertThat(result.winnerTripPlaceId()).isNull();
        assertThat(first.getStatus()).isEqualTo(TripPlaceStatus.SAVED);
    }

    @Test
    @DisplayName("t4 진행 중인 장소로 새 투표를 만들면 중복 투표를 거부한다")
    void t4_openVotePreventsDuplicateVote() {
        given(tripPlaceRepository.findByIdAndTripIdForUpdate(10L, 1L)).willReturn(Optional.of(first));
        given(voteRequestRepository.existsOpenVoteForAnyPlace(any(), any())).willReturn(true);

        assertThatThrownBy(() -> service.startVote(1L, new CreatePlaceVoteRequest(
                PlaceVoteType.PLACE_APPROVAL, 10L, null, null)))
                .isInstanceOf(BusinessException.class);

        then(voteRequestRepository).should(org.mockito.Mockito.never()).save(any());
    }

    @Test
    @DisplayName("t5 서로 다른 등록 ID여도 같은 Google 장소면 A/B 투표를 거부한다")
    void t5_sameGooglePlaceCannotBattleItself() {
        Place sharedPlace = Place.builder().googlePlaceId("same-google-id").name("같은 장소").build();
        first = tripPlace(10L, sharedPlace);
        second = tripPlace(20L, sharedPlace);
        given(tripPlaceRepository.findAllByIdsAndTripIdForUpdate(List.of(10L, 20L), 1L))
                .willReturn(List.of(first, second));

        assertThatThrownBy(() -> service.startVote(1L, new CreatePlaceVoteRequest(
                PlaceVoteType.PLACE_BATTLE, 10L, 20L, null)))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("t6 투표 응답을 저장하면 여행방 실시간 갱신 이벤트를 기록한다")
    void t6_responseRecordsRealtimeCollaborationEvent() {
        PlaceVoteRequest vote = vote(PlaceVoteType.PLACE_APPROVAL, null);
        given(voteRequestRepository.findByIdForUpdate(100L)).willReturn(Optional.of(vote));
        given(tripPlaceRepository.findByIdAndTripIdForUpdate(10L, 1L)).willReturn(Optional.of(first));
        given(voteResponseRepository.findByVoteRequestIdAndMemberId(100L, 1L)).willReturn(Optional.empty());
        given(voteResponseRepository.findAllByVoteRequestId(100L)).willReturn(List.of(response(1L, PlaceVoteChoice.AGREE)));

        service.respondByVoteId(1L, 100L, new RespondPlaceVoteRequest(PlaceVoteChoice.AGREE));

        then(collaborationEventService).should().record(
                org.mockito.ArgumentMatchers.eq(1L), org.mockito.ArgumentMatchers.eq(1L),
                org.mockito.ArgumentMatchers.eq("PLACE_VOTE_RESPONDED"),
                org.mockito.ArgumentMatchers.eq("PLACE_VOTE"), org.mockito.ArgumentMatchers.eq(100L),
                any(), any(), any(), any());
    }

    private TripPlace place(Long id, String name) { TripPlace p = TripPlace.builder().tripId(1L).place(Place.builder().name(name).address("서울").placeType("restaurant").build()).addedBy(11L).status(TripPlaceStatus.SAVED).build(); ReflectionTestUtils.setField(p, "id", id); return p; }
    private TripPlace tripPlace(Long id, Place place) { TripPlace p = TripPlace.builder().tripId(1L).place(place).addedBy(11L).status(TripPlaceStatus.SAVED).build(); ReflectionTestUtils.setField(p, "id", id); return p; }
    private PlaceVoteRequest vote(PlaceVoteType type, Long secondary) { PlaceVoteRequest v = PlaceVoteRequest.builder().tripPlaceId(10L).secondaryTripPlaceId(secondary).voteType(type).status(PlaceVoteStatus.OPEN).requiredResponseCount(2).totalMemberCount(2).createdAt(java.time.LocalDateTime.now()).expiresAt(java.time.LocalDateTime.now().plusHours(1)).build(); ReflectionTestUtils.setField(v, "id", 100L); return v; }
    private PlaceVoteResponse response(Long memberId, PlaceVoteChoice choice) { return PlaceVoteResponse.builder().voteRequestId(100L).memberId(memberId).choice(choice).createdAt(java.time.LocalDateTime.now()).updatedAt(java.time.LocalDateTime.now()).build(); }
}
