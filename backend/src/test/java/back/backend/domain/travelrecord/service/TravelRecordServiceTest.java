package back.backend.domain.travelrecord.service;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;

import back.backend.domain.collaboration.activitylog.service.ActivityLogService;
import back.backend.domain.member.repository.MemberRepository;
import back.backend.domain.place.repository.TripPlaceRepository;
import back.backend.domain.place.service.TripAccessChecker;
import back.backend.domain.travelrecord.dto.TravelRecordCreateRequest;
import back.backend.domain.travelrecord.exception.TravelRecordErrorCode;
import back.backend.domain.travelrecord.repository.*;
import back.backend.domain.trip.entity.Trip;
import back.backend.domain.trip.repository.TripRepository;
import back.backend.global.exception.BusinessException;
import java.time.*;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class TravelRecordServiceTest {

    @Mock TravelRecordRepository recordRepository;
    @Mock TravelPhotoRepository photoRepository;
    @Mock TripRetrospectiveRepository retrospectiveRepository;
    @Mock TripRepository tripRepository;
    @Mock TripPlaceRepository tripPlaceRepository;
    @Mock MemberRepository memberRepository;
    @Mock TripAccessChecker accessChecker;
    @Mock ActivityLogService activityLogService;

    private TravelRecordService service;

    @BeforeEach
    void setUp() {
        service = new TravelRecordService(
                recordRepository, photoRepository, retrospectiveRepository,
                tripRepository, tripPlaceRepository, memberRepository,
                accessChecker, activityLogService
        );
    }

    @Test
    @DisplayName("t1 여행 기간 밖의 방문 일시는 기록할 수 없다")
    void t1_createRecordOutsideTripDatesThrowsException() {
        Trip trip = Trip.create(
                1L, "후쿠오카", null, Set.of(), "후쿠오카",
                LocalDate.of(2026, 7, 23), LocalDate.of(2026, 7, 28)
        );
        given(accessChecker.requireEdit(1L)).willReturn(1L);
        given(tripRepository.findById(1L)).willReturn(java.util.Optional.of(trip));

        TravelRecordCreateRequest request = new TravelRecordCreateRequest(
                10L, null, LocalDateTime.of(2026, 7, 29, 10, 0),
                "여행 종료 후 기록", List.of()
        );

        assertThatThrownBy(() -> service.create(1L, request))
                .isInstanceOf(BusinessException.class)
                .extracting(exception -> ((BusinessException) exception).getErrorCode())
                .isEqualTo(TravelRecordErrorCode.VISITED_AT_OUT_OF_RANGE);
    }

    @Test
    @DisplayName("t2 메모와 사진이 모두 비어 있으면 기록할 수 없다")
    void t2_createEmptyRecordThrowsException() {
        Trip trip = Trip.create(
                1L, "후쿠오카", null, Set.of(), "후쿠오카",
                LocalDate.of(2026, 7, 23), LocalDate.of(2026, 7, 28)
        );
        given(accessChecker.requireEdit(1L)).willReturn(1L);
        given(tripRepository.findById(1L)).willReturn(java.util.Optional.of(trip));

        TravelRecordCreateRequest request = new TravelRecordCreateRequest(
                10L, null, LocalDateTime.of(2026, 7, 24, 10, 0),
                " ", List.of()
        );

        assertThatThrownBy(() -> service.create(1L, request))
                .isInstanceOf(BusinessException.class)
                .extracting(exception -> ((BusinessException) exception).getErrorCode())
                .isEqualTo(TravelRecordErrorCode.EMPTY_RECORD);
    }
}
