package back.backend.domain.trip.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.when;

import back.backend.domain.member.repository.MemberRepository;
import back.backend.domain.card.repository.PlanCardRepository;
import back.backend.domain.place.service.TripAccessChecker;
import back.backend.domain.collaboration.activitylog.service.ActivityLogService;
import back.backend.domain.collaboration.notification.service.NotificationService;
import back.backend.domain.trip.dto.TripRequest;
import back.backend.domain.trip.dto.TripVisibilityRequest;
import back.backend.domain.trip.entity.TripVisibility;
import back.backend.domain.card.entity.PlanCard;
import back.backend.domain.trip.entity.CompanionType;
import back.backend.domain.trip.entity.TravelStyle;
import back.backend.domain.trip.entity.Trip;
import back.backend.domain.trip.entity.TripStatus;
import back.backend.domain.trip.exception.TripErrorCode;
import back.backend.domain.trip.repository.TripMemberRepository;
import back.backend.domain.trip.repository.TripRepository;
import back.backend.global.exception.BusinessException;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
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
    @Mock TripPresenceService tripPresenceService;
    @Mock TripAccessChecker tripAccessChecker;
    private TripService tripService;
    private final Clock clock = Clock.fixed(
            Instant.parse("2026-07-31T00:00:00Z"),
            ZoneId.of("Asia/Seoul")
    );

    @BeforeEach
    void setUp() {
        tripService = new TripService(tripRepository, tripMemberRepository, memberRepository,
                activityLogService, notificationService, planCardRepository,
                tripPresenceService, tripAccessChecker, clock);
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
    @DisplayName("t3 여행방 멤버는 생성자가 아니어도 여행방을 수정할 수 있다")
    void t3_joinedMemberCanUpdateTrip() {
        Trip trip = trip("제주 여행");
        when(tripRepository.findByIdAndMemberIdAndStatusNot(10L, 2L, TripStatus.CANCELLED))
                .thenReturn(Optional.of(trip));

        var response = tripService.update(2L, 10L, request("수정"));

        assertThat(response.title()).isEqualTo("수정");
    }

    @Test
    @DisplayName("t4 마지막 멤버가 여행방을 삭제하면 여행방 행을 물리 삭제한다")
    void t4_deleteTripPhysicallyDeletesTrip() {
        Trip trip = trip("제주 여행");
        when(tripRepository.findByIdAndStatusNotForMembershipChange(10L, TripStatus.CANCELLED))
                .thenReturn(Optional.of(trip));
        when(tripMemberRepository.existsByTripIdAndMemberId(10L, 1L)).thenReturn(true);
        when(tripMemberRepository.countByTripId(10L)).thenReturn(1L);

        tripService.delete(1L, 10L);

        verify(tripRepository).delete(trip);
        verify(activityLogService, never()).create(any());
        verify(notificationService, never()).create(any());
    }

    @Test
    @DisplayName("t5 여행방 생성 시 공개 요청이 포함되어도 완료 전에는 비공개로 저장한다")
    void t5_createTripAlwaysSavesPrivateVisibility() {
        when(memberRepository.existsById(1L)).thenReturn(true);
        when(tripRepository.save(any(Trip.class))).thenAnswer(invocation -> {
            Trip savedTrip = invocation.getArgument(0);
            ReflectionTestUtils.setField(savedTrip, "id", 10L);
            return savedTrip;
        });

        TripRequest request = new TripRequest(
                "제주 여행", CompanionType.FRIENDS, Set.of(TravelStyle.FOOD), "제주도",
                null, null, TripVisibility.PUBLIC, null, null, null);

        var response = tripService.create(1L, request);

        assertThat(response.visibility()).isEqualTo(TripVisibility.PRIVATE);
    }

    @Test
    @DisplayName("t6 완료된 여행방의 공개 범위를 변경하면 자동 생성된 카드 공개 범위도 함께 변경한다")
    void t6_updateVisibilitySynchronizesCompletedTripCard() {
        Trip trip = Trip.create(
                1L, "제주 여행", null, Set.of(), null,
                LocalDate.of(2026, 7, 28), LocalDate.of(2026, 7, 31));
        ReflectionTestUtils.setField(trip, "id", 10L);
        trip.completeAutomatically(LocalDate.of(2026, 8, 1));
        PlanCard card = PlanCard.create(10L, "제주 여행", TripVisibility.PRIVATE, 1L);
        when(tripRepository.findByIdAndMemberIdAndStatusNot(10L, 1L, TripStatus.CANCELLED))
                .thenReturn(Optional.of(trip));
        when(planCardRepository.findByTripId(10L)).thenReturn(Optional.of(card));

        var response = tripService.updateVisibility(
                1L, 10L, new TripVisibilityRequest(TripVisibility.PUBLIC));

        assertThat(response.visibility()).isEqualTo(TripVisibility.PUBLIC);
        assertThat(card.getVisibility()).isEqualTo(TripVisibility.PUBLIC);
        verify(activityLogService).create(any());
        verify(notificationService).create(any());
    }

    @Test
    @DisplayName("t7 완료되지 않은 여행방의 공개 범위를 변경하면 예외가 발생한다")
    void t7_updateVisibilityRejectsTripBeforeCompletion() {
        Trip trip = trip("제주 여행");
        when(tripRepository.findByIdAndMemberIdAndStatusNot(10L, 1L, TripStatus.CANCELLED))
                .thenReturn(Optional.of(trip));

        assertThatThrownBy(() -> tripService.updateVisibility(
                1L, 10L, new TripVisibilityRequest(TripVisibility.PUBLIC)))
                .isInstanceOfSatisfying(BusinessException.class,
                        exception -> assertThat(exception.getErrorCode())
                                .isEqualTo(TripErrorCode.TRIP_VISIBILITY_NOT_AVAILABLE));
    }

    @Test
    @DisplayName("t8 다른 멤버가 남아 있는 여행방은 삭제할 수 없다")
    void t8_deleteTripRejectsWhenOtherMembersRemain() {
        Trip trip = trip("제주 여행");
        when(tripRepository.findByIdAndStatusNotForMembershipChange(10L, TripStatus.CANCELLED))
                .thenReturn(Optional.of(trip));
        when(tripMemberRepository.existsByTripIdAndMemberId(10L, 1L)).thenReturn(true);
        when(tripMemberRepository.countByTripId(10L)).thenReturn(2L);

        assertThatThrownBy(() -> tripService.delete(1L, 10L))
                .isInstanceOfSatisfying(BusinessException.class,
                        exception -> assertThat(exception.getErrorCode())
                                .isEqualTo(TripErrorCode.TRIP_HAS_OTHER_MEMBERS));

        assertThat(trip.getStatus()).isNotEqualTo(TripStatus.CANCELLED);
    }

    @Test
    @DisplayName("t9 멤버가 여행방을 나가면 멤버십만 삭제하고 여행 데이터는 유지한다")
    void t9_leaveTripDeletesOnlyMembership() {
        Trip trip = trip("제주 여행");
        when(tripRepository.findByIdAndStatusNotForMembershipChange(10L, TripStatus.CANCELLED))
                .thenReturn(Optional.of(trip));
        when(tripMemberRepository.existsByTripIdAndMemberId(10L, 1L)).thenReturn(true);
        when(tripMemberRepository.countByTripId(10L)).thenReturn(2L);

        tripService.leave(1L, 10L);

        verify(tripMemberRepository).deleteByTripIdAndMemberId(10L, 1L);
        verify(tripRepository, never()).delete(any());
        assertThat(trip.getStatus()).isNotEqualTo(TripStatus.CANCELLED);
    }

    @Test
    @DisplayName("t10 마지막 멤버는 여행방 나가기 대신 삭제해야 한다")
    void t10_leaveTripRejectsLastMember() {
        Trip trip = trip("제주 여행");
        when(tripRepository.findByIdAndStatusNotForMembershipChange(10L, TripStatus.CANCELLED))
                .thenReturn(Optional.of(trip));
        when(tripMemberRepository.existsByTripIdAndMemberId(10L, 1L)).thenReturn(true);
        when(tripMemberRepository.countByTripId(10L)).thenReturn(1L);

        assertThatThrownBy(() -> tripService.leave(1L, 10L))
                .isInstanceOfSatisfying(BusinessException.class,
                        exception -> assertThat(exception.getErrorCode())
                                .isEqualTo(TripErrorCode.LAST_TRIP_MEMBER));
    }

    @Test
    @DisplayName("t11 여행방 생성일이 오늘 또는 과거이면 생성을 거부한다")
    void t11_createTripRejectsTodayOrPastStartDate() {
        when(memberRepository.existsById(1L)).thenReturn(true);

        for (LocalDate startDate : List.of(
                LocalDate.of(2026, 7, 30),
                LocalDate.of(2026, 7, 31))) {
            TripRequest request = new TripRequest(
                    "제주 여행",
                    CompanionType.FRIENDS,
                    Set.of(TravelStyle.FOOD),
                    "제주도",
                    startDate,
                    startDate.plusDays(2),
                    TripVisibility.PRIVATE,
                    null,
                    null,
                    null
            );

            assertThatThrownBy(() -> tripService.create(1L, request))
                    .isInstanceOfSatisfying(BusinessException.class,
                            exception -> assertThat(exception.getErrorCode())
                                    .isEqualTo(TripErrorCode.INVALID_TRIP));
        }

        verify(tripRepository, never()).save(any());
    }

    @Test
    @DisplayName("t12 여행방 수정일이 오늘 또는 과거이면 수정을 거부한다")
    void t12_updateTripRejectsTodayOrPastStartDate() {
        Trip trip = trip("제주 여행");
        when(tripRepository.findByIdAndMemberIdAndStatusNot(10L, 2L, TripStatus.CANCELLED))
                .thenReturn(Optional.of(trip));
        TripRequest request = new TripRequest(
                "수정 여행",
                CompanionType.FRIENDS,
                Set.of(TravelStyle.FOOD),
                "제주도",
                LocalDate.of(2026, 7, 31),
                LocalDate.of(2026, 8, 2),
                TripVisibility.PRIVATE,
                null,
                null,
                null
        );

        assertThatThrownBy(() -> tripService.update(2L, 10L, request))
                .isInstanceOfSatisfying(BusinessException.class,
                        exception -> assertThat(exception.getErrorCode())
                                .isEqualTo(TripErrorCode.INVALID_TRIP));
    }

    @Test
    @DisplayName("t13 진행 중인 여행방은 기존 시작일을 유지하면 다른 정보를 수정할 수 있다")
    void t13_updateTripAllowsUnchangedPastStartDate() {
        LocalDate startDate = LocalDate.of(2026, 7, 30);
        Trip trip = Trip.create(
                1L, "제주 여행", CompanionType.FRIENDS, Set.of(TravelStyle.FOOD),
                "제주도", startDate, LocalDate.of(2026, 8, 2)
        );
        when(tripRepository.findByIdAndMemberIdAndStatusNot(10L, 2L, TripStatus.CANCELLED))
                .thenReturn(Optional.of(trip));
        TripRequest request = new TripRequest(
                "수정 여행", CompanionType.FRIENDS, Set.of(TravelStyle.FOOD), "제주도",
                startDate, LocalDate.of(2026, 8, 2), TripVisibility.PRIVATE,
                null, null, null
        );

        var response = tripService.update(2L, 10L, request);

        assertThat(response.title()).isEqualTo("수정 여행");
    }

    private TripRequest request(String title) {
        return new TripRequest(title, CompanionType.FRIENDS, Set.of(TravelStyle.FOOD), "제주도",
                LocalDate.of(2026, 8, 12), LocalDate.of(2026, 8, 15), TripVisibility.PRIVATE, null, null, null);
    }

    private Trip trip(String title) {
        return Trip.create(1L, title, null, Set.of(), null, null, null);
    }
}
