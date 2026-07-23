package back.backend.domain.trip.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import back.backend.domain.member.repository.MemberRepository;
import back.backend.domain.trip.dto.TripRequest;
import back.backend.domain.trip.entity.CompanionType;
import back.backend.domain.trip.entity.TravelStyle;
import back.backend.domain.trip.entity.Trip;
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

@ExtendWith(MockitoExtension.class)
class TripServiceTest {
    @Mock TripRepository tripRepository;
    @Mock TripMemberRepository tripMemberRepository;
    @Mock MemberRepository memberRepository;
    private TripService tripService;

    @BeforeEach
    void setUp() {
        tripService = new TripService(tripRepository, tripMemberRepository, memberRepository);
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
        when(tripRepository.findAllByOwnerIdOrderByCreatedAtDesc(1L))
                .thenReturn(List.of(trip("제주 여행"), trip("부산 여행")));

        assertThat(tripService.getMyTrips(1L)).extracting("title")
                .containsExactly("제주 여행", "부산 여행");
    }

    @Test
    @DisplayName("t3 소유자가 아닌 회원이 여행방을 수정하면 찾을 수 없음 예외가 발생한다")
    void t3_updateTripRejectsNonOwner() {
        when(tripRepository.findByIdAndOwnerId(10L, 2L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> tripService.update(2L, 10L, request("수정")))
                .isInstanceOfSatisfying(BusinessException.class,
                        exception -> assertThat(exception.getErrorCode()).isEqualTo(TripErrorCode.TRIP_NOT_FOUND));
    }

    @Test
    @DisplayName("t4 소유자가 여행방을 삭제하면 멤버십을 먼저 삭제하고 여행방을 삭제한다")
    void t4_deleteTripRemovesMembershipAndTrip() {
        Trip trip = trip("제주 여행");
        when(tripRepository.findByIdAndOwnerId(10L, 1L)).thenReturn(Optional.of(trip));

        tripService.delete(1L, 10L);

        verify(tripMemberRepository).deleteAllByTripId(10L);
        verify(tripRepository).delete(trip);
    }

    private TripRequest request(String title) {
        return new TripRequest(title, CompanionType.FRIENDS, Set.of(TravelStyle.FOOD), "제주도",
                LocalDate.of(2026, 8, 12), LocalDate.of(2026, 8, 15));
    }

    private Trip trip(String title) {
        return Trip.create(1L, title, null, Set.of(), null, null, null);
    }
}
