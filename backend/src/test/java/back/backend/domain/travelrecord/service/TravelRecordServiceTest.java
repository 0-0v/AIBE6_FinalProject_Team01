package back.backend.domain.travelrecord.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

import back.backend.domain.collaboration.activitylog.service.ActivityLogService;
import back.backend.domain.member.repository.MemberRepository;
import back.backend.domain.place.entity.Place;
import back.backend.domain.place.entity.TripPlace;
import back.backend.domain.place.repository.TripPlaceRepository;
import back.backend.domain.place.service.TripAccessChecker;
import back.backend.domain.travelrecord.dto.TravelRecordCreateRequest;
import back.backend.domain.travelrecord.dto.TravelRecordUpdateRequest;
import back.backend.domain.travelrecord.entity.TravelRecord;
import back.backend.domain.travelrecord.exception.TravelRecordErrorCode;
import back.backend.domain.travelrecord.port.TravelPhotoStorage;
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
    @Mock TravelPhotoStorage travelPhotoStorage;

    private TravelRecordService service;

    @BeforeEach
    void setUp() {
        service = new TravelRecordService(
                recordRepository, photoRepository, retrospectiveRepository,
                tripRepository, tripPlaceRepository, memberRepository,
                accessChecker, activityLogService, travelPhotoStorage
        );
    }

    @Test
    @DisplayName("t1 여행 기간 밖의 방문 일시는 기록할 수 없다")
    void t1_createRecordOutsideTripDatesThrowsException() {
        Trip trip = Trip.create(
                1L, "후쿠오카", null, Set.of(), "후쿠오카",
                LocalDate.of(2026, 7, 23), LocalDate.of(2026, 7, 28)
        );
        given(accessChecker.requireMember(1L)).willReturn(1L);
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
        given(accessChecker.requireMember(1L)).willReturn(1L);
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

    @Test
    @DisplayName("t3 업로드된 사진 URL로 기록을 생성하면 모든 사진을 기록에 연결한다")
    void t3_createRecordConnectsUploadedPhotoUrls() {
        Trip trip = Trip.create(
                1L, "후쿠오카", null, Set.of(), "후쿠오카",
                LocalDate.of(2026, 7, 23), LocalDate.of(2026, 7, 28)
        );
        Place place = mock(Place.class);
        TripPlace tripPlace = mock(TripPlace.class);
        TravelRecord savedRecord = mock(TravelRecord.class);
        given(accessChecker.requireMember(1L)).willReturn(1L);
        given(tripRepository.findById(1L)).willReturn(java.util.Optional.of(trip));
        given(tripPlaceRepository.findByIdAndTripId(10L, 1L))
                .willReturn(java.util.Optional.of(tripPlace));
        given(tripPlace.getPlace()).willReturn(place);
        given(place.getId()).willReturn(20L);
        given(recordRepository.save(any(TravelRecord.class))).willReturn(savedRecord);
        given(savedRecord.getId()).willReturn(30L);
        given(savedRecord.getRecordedBy()).willReturn(1L);
        given(savedRecord.getVisitedAt()).willReturn(LocalDateTime.of(2026, 7, 24, 10, 0));

        List<String> imageUrls = List.of(
                "/uploads/travel-records/1/first.png",
                "/uploads/travel-records/1/second.png"
        );
        var response = service.create(1L, new TravelRecordCreateRequest(
                10L, null, LocalDateTime.of(2026, 7, 24, 10, 0),
                "사진 기록", imageUrls
        ));

        assertThat(response.imageUrls()).containsExactlyElementsOf(imageUrls);
        verify(photoRepository).saveAll(argThat(photos -> {
            var iterator = photos.iterator();
            int count = 0;
            while (iterator.hasNext()) {
                assertThat(iterator.next().getImageUrl()).isIn(imageUrls);
                count++;
            }
            return count == 2;
        }));
    }

    @Test
    @DisplayName("t4 같은 여행 장소에 기록이 존재하면 새 기록을 만들 수 없다")
    void t4_createDuplicatePlaceRecordThrowsException() {
        Trip trip = Trip.create(
                1L, "후쿠오카", null, Set.of(), "후쿠오카",
                LocalDate.of(2026, 7, 23), LocalDate.of(2026, 7, 28)
        );
        Place place = mock(Place.class);
        TripPlace tripPlace = mock(TripPlace.class);
        given(accessChecker.requireMember(1L)).willReturn(1L);
        given(tripRepository.findById(1L)).willReturn(java.util.Optional.of(trip));
        given(tripPlaceRepository.findByIdAndTripId(10L, 1L))
                .willReturn(java.util.Optional.of(tripPlace));
        given(tripPlace.getPlace()).willReturn(place);
        given(place.getId()).willReturn(20L);
        given(recordRepository.existsByTripIdAndPlaceId(1L, 20L)).willReturn(true);

        assertThatThrownBy(() -> service.create(1L, new TravelRecordCreateRequest(
                10L, null, LocalDateTime.of(2026, 7, 24, 10, 0), "기록", List.of()
        )))
                .isInstanceOf(BusinessException.class)
                .extracting(exception -> ((BusinessException) exception).getErrorCode())
                .isEqualTo(TravelRecordErrorCode.DUPLICATE_PLACE_RECORD);
    }

    @Test
    @DisplayName("t5 여행방 편집 멤버는 공동 기록의 메모와 사진을 수정할 수 있다")
    void t5_updateSharedRecordReplacesContent() {
        Trip trip = Trip.create(
                1L, "후쿠오카", null, Set.of(), "후쿠오카",
                LocalDate.of(2026, 7, 23), LocalDate.of(2026, 7, 28)
        );
        TravelRecord record = mock(TravelRecord.class);
        given(accessChecker.requireMember(1L)).willReturn(2L);
        given(tripRepository.findById(1L)).willReturn(java.util.Optional.of(trip));
        given(recordRepository.findByIdAndTripId(30L, 1L)).willReturn(java.util.Optional.of(record));
        given(record.getRecordedBy()).willReturn(1L);
        given(record.getVisitedAt()).willReturn(LocalDateTime.of(2026, 7, 24, 10, 0));
        given(tripPlaceRepository.findAllOrderedByTripId(1L)).willReturn(List.of());

        service.update(1L, 30L, new TravelRecordUpdateRequest("함께 수정한 메모", List.of("/photo.png")));

        verify(record).updateContent("함께 수정한 메모");
        verify(photoRepository).deleteAllByTravelRecordId(30L);
        verify(photoRepository).saveAll(any());
    }

    @Test
    @DisplayName("t6 여행방 편집 멤버는 공동 기록을 삭제할 수 있다")
    void t6_deleteSharedRecordRemovesRecordAndPhotos() {
        TravelRecord record = mock(TravelRecord.class);
        given(accessChecker.requireMember(1L)).willReturn(2L);
        given(recordRepository.findByIdAndTripId(30L, 1L)).willReturn(java.util.Optional.of(record));

        service.delete(1L, 30L);

        verify(photoRepository).deleteAllByTravelRecordId(30L);
        verify(recordRepository).delete(record);
    }

    @Test
    @DisplayName("t7 여행 날짜가 바뀌어 기존 기록의 방문 일시가 기간 밖이어도 메모와 사진을 수정할 수 있다")
    void t7_updateRecordSucceedsEvenWhenVisitedAtNowOutsideTripDates() {
        Trip trip = Trip.create(
                1L, "후쿠오카", null, Set.of(), "후쿠오카",
                LocalDate.of(2026, 9, 1), LocalDate.of(2026, 9, 2)
        );
        TravelRecord record = mock(TravelRecord.class);
        given(accessChecker.requireMember(1L)).willReturn(2L);
        given(tripRepository.findById(1L)).willReturn(java.util.Optional.of(trip));
        given(recordRepository.findByIdAndTripId(30L, 1L)).willReturn(java.util.Optional.of(record));
        given(record.getRecordedBy()).willReturn(1L);
        // 여행 날짜가 나중에 바뀌어, 기록 당시의 방문 일시(7/24)가 현재 기간(9/1~9/2) 밖에 있다.
        given(record.getVisitedAt()).willReturn(LocalDateTime.of(2026, 7, 24, 10, 0));
        given(tripPlaceRepository.findAllOrderedByTripId(1L)).willReturn(List.of());

        assertThatCode(() -> service.update(
                1L, 30L, new TravelRecordUpdateRequest("수정한 메모", List.of("/photo.png"))
        )).doesNotThrowAnyException();

        verify(record).updateContent("수정한 메모");
        verify(photoRepository).deleteAllByTravelRecordId(30L);
        verify(photoRepository).saveAll(any());
    }

    @Test
    @DisplayName("t8 여행 날짜가 바뀌어 일부 기록의 방문 일시가 기간 밖이어도 목록 조회는 실패하지 않는다")
    void t8_getRecordsSucceedsEvenWhenSomeVisitedAtNowOutsideTripDates() {
        Trip trip = Trip.create(
                1L, "후쿠오카", null, Set.of(), "후쿠오카",
                LocalDate.of(2026, 9, 1), LocalDate.of(2026, 9, 2)
        );
        TravelRecord outOfRangeRecord = mock(TravelRecord.class);
        given(accessChecker.requireView(1L)).willReturn(1L);
        given(tripRepository.findById(1L)).willReturn(java.util.Optional.of(trip));
        given(outOfRangeRecord.getId()).willReturn(30L);
        given(outOfRangeRecord.getRecordedBy()).willReturn(1L);
        given(outOfRangeRecord.getPlaceId()).willReturn(20L);
        given(outOfRangeRecord.getVisitedAt()).willReturn(LocalDateTime.of(2026, 7, 24, 10, 0));
        given(recordRepository.findAllByTripIdOrderByVisitedAtDescIdDesc(1L))
                .willReturn(List.of(outOfRangeRecord));
        given(photoRepository.findAllByTravelRecordIdInOrderBySortOrderAsc(List.of(30L)))
                .willReturn(List.of());
        given(tripPlaceRepository.findAllOrderedByTripId(1L)).willReturn(List.of());
        given(memberRepository.findAllById(List.of(1L))).willReturn(List.of());

        List<back.backend.domain.travelrecord.dto.TravelRecordResponse> responses =
                service.getRecords(1L);

        assertThat(responses).hasSize(1);
    }
}
