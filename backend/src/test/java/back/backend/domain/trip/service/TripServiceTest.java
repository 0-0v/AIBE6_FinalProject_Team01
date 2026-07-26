package back.backend.domain.trip.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import back.backend.domain.member.repository.MemberRepository;
import back.backend.domain.card.repository.PlanCardRepository;
import back.backend.domain.card.repository.PlanCardTagRepository;
import back.backend.domain.card.repository.TripTagRepository;
import back.backend.domain.collaboration.activitylog.service.ActivityLogService;
import back.backend.domain.collaboration.notification.service.NotificationService;
import back.backend.domain.trip.dto.TripRequest;
import back.backend.domain.trip.dto.TripCompleteRequest;
import back.backend.domain.trip.entity.TripVisibility;
import back.backend.domain.card.entity.PlanCard;
import back.backend.domain.card.entity.TripTag;
import back.backend.domain.trip.entity.CompanionType;
import back.backend.domain.trip.entity.TravelStyle;
import back.backend.domain.trip.entity.Trip;
import back.backend.domain.trip.entity.TripStatus;
import back.backend.domain.trip.exception.TripErrorCode;
import back.backend.domain.trip.repository.TripMemberRepository;
import back.backend.domain.trip.repository.TripRepository;
import back.backend.global.exception.BusinessException;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class TripServiceTest {
    @Mock TripRepository tripRepository;
    @Mock TripMemberRepository tripMemberRepository;
    @Mock MemberRepository memberRepository;
    @Mock ActivityLogService activityLogService;
    @Mock NotificationService notificationService;
    @Mock PlanCardRepository planCardRepository;
    @Mock TripTagRepository tripTagRepository;
    @Mock PlanCardTagRepository planCardTagRepository;
    private TripService tripService;

    @BeforeEach
    void setUp() {
        tripService = new TripService(tripRepository, tripMemberRepository, memberRepository,
                activityLogService, notificationService, planCardRepository, tripTagRepository,
                planCardTagRepository);
    }

    @Test
    @DisplayName("t1 회원이 유효한 정보로 여행방을 생성하면 소유자 멤버십도 저장한다")
    void t1_createTripSavesTripAndOwnerMembership() {
        when(memberRepository.existsById(1L)).thenReturn(true);
        when(tripRepository.save(any(Trip.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = tripService.create(1L, request("제주 여행"));

        assertThat(response.title()).isEqualTo("제주 여행");
        verify(tripMemberRepository).save(any());
    }

    @Test
    @DisplayName("t2 회원이 본인 여행방 목록을 조회하면 생성 역순 결과를 반환한다")
    void t2_getMyTripsReturnsOwnedTrips() {
        when(tripRepository.findAllAccessibleByMemberIdAndStatusNot(1L, TripStatus.CANCELLED))
                .thenReturn(List.of(trip("제주 여행"), trip("부산 여행")));

        assertThat(tripService.getMyTrips(1L)).extracting("title")
                .containsExactly("제주 여행", "부산 여행");
    }

    @Test
    @DisplayName("t3 소유자가 아닌 회원이 여행방을 수정하면 찾을 수 없음 예외가 발생한다")
    void t3_updateTripRejectsNonOwner() {
        when(tripRepository.findByIdAndOwnerIdAndStatusNot(10L, 2L, TripStatus.CANCELLED)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> tripService.update(2L, 10L, request("수정")))
                .isInstanceOfSatisfying(BusinessException.class,
                        exception -> assertThat(exception.getErrorCode()).isEqualTo(TripErrorCode.TRIP_NOT_FOUND));
    }

    @Test
    @DisplayName("t4 소유자가 여행방을 삭제하면 활동 이력 보존을 위해 취소 상태로 전환한다")
    void t4_deleteTripChangesStatusToCancelled() {
        Trip trip = trip("제주 여행");
        when(tripRepository.findByIdAndOwnerIdAndStatusNot(10L, 1L, TripStatus.CANCELLED)).thenReturn(Optional.of(trip));

        tripService.delete(1L, 10L);

        assertThat(trip.getStatus()).isEqualTo(TripStatus.CANCELLED);
        verify(activityLogService).create(any());
        verify(notificationService).create(any());
    }

    @Test
    @DisplayName("t5 소유자가 여행방을 완료하면 공개 범위와 태그를 포함한 여행 카드를 생성한다")
    void t5_completeTripCreatesCardAndTags() {
        Trip trip = trip("제주 여행");
        ReflectionTestUtils.setField(trip, "id", 10L);
        when(tripRepository.findByIdAndOwnerIdAndStatusNot(10L, 1L, TripStatus.CANCELLED))
                .thenReturn(Optional.of(trip));
        when(planCardRepository.existsByTripId(10L)).thenReturn(false);
        when(planCardRepository.save(any())).thenAnswer(invocation -> {
            PlanCard card = invocation.getArgument(0);
            ReflectionTestUtils.setField(card, "id", 20L);
            return card;
        });
        when(tripTagRepository.save(any())).thenAnswer(invocation -> {
            TripTag tag = invocation.getArgument(0);
            ReflectionTestUtils.setField(tag, "id", 30L);
            return tag;
        });

        var response = tripService.complete(
                1L, 10L, new TripCompleteRequest(TripVisibility.PUBLIC, List.of("#친구와", "액티비티", "친구와")));

        assertThat(response.visibility()).isEqualTo(TripVisibility.PUBLIC);
        assertThat(response.tags()).containsExactly("친구와", "액티비티");
        assertThat(trip.getStatus()).isEqualTo(TripStatus.COMPLETED);
        verify(planCardTagRepository, org.mockito.Mockito.times(2)).save(any());
        verify(activityLogService).create(any());
        verify(notificationService).create(any());
    }

    private TripRequest request(String title) {
        return new TripRequest(title, CompanionType.FRIENDS, Set.of(TravelStyle.FOOD), "제주도",
                LocalDate.of(2026, 8, 12), LocalDate.of(2026, 8, 15));
    }

    private Trip trip(String title) {
        return Trip.create(1L, title, null, Set.of(), null, null, null);
    }
}
