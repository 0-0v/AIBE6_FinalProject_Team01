package back.backend.domain.place.service;

import back.backend.domain.place.dto.request.AddTripPlaceRequest;
import back.backend.domain.place.dto.request.UpdateNoteRequest;
import back.backend.domain.place.dto.request.UpdateStatusRequest;
import back.backend.domain.place.dto.response.TripPlaceResponse;
import back.backend.domain.place.entity.Place;
import back.backend.domain.place.entity.TripPlace;
import back.backend.domain.place.entity.TripPlaceStatus;
import back.backend.domain.place.exception.PlaceErrorCode;
import back.backend.domain.place.repository.PlaceRepository;
import back.backend.domain.place.repository.TripPlaceRepository;
import back.backend.global.exception.BusinessException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.never;

@ExtendWith(MockitoExtension.class)
class TripPlaceServiceTest {

    @Mock
    private PlaceRepository placeRepository;

    @Mock
    private TripPlaceRepository tripPlaceRepository;

    @InjectMocks
    private TripPlaceService tripPlaceService;

    private Place savedPlace;
    private TripPlace savedTripPlace;

    @BeforeEach
    void setUp() {
        savedPlace = Place.builder()
                .googlePlaceId("ChIJxxx")
                .name("오설록 티 뮤지엄")
                .address("제주 서귀포시 신화역사로 15")
                .latitude(33.3065)
                .longitude(126.2897)
                .placeType("tourist_attraction")
                .build();

        savedTripPlace = TripPlace.builder()
                .tripId(1L)
                .place(savedPlace)
                .addedBy(1L)
                .status(TripPlaceStatus.CANDIDATE)
                .build();
    }

    @Test
    @DisplayName("t1 places에 없는 장소를 추가하면 places에 저장 후 trip_places에 등록한다")
    void t1_새장소추가시places저장후tripplaces등록() {
        AddTripPlaceRequest request = new AddTripPlaceRequest(
                "ChIJxxx", "오설록 티 뮤지엄", "제주 서귀포시 신화역사로 15",
                33.3065, 126.2897, "tourist_attraction", null, null);

        given(placeRepository.findByGooglePlaceId("ChIJxxx")).willReturn(Optional.empty());
        given(placeRepository.save(any(Place.class))).willReturn(savedPlace);
        given(tripPlaceRepository.existsByTripIdAndPlaceId(1L, savedPlace.getId())).willReturn(false);
        given(tripPlaceRepository.save(any(TripPlace.class))).willReturn(savedTripPlace);

        TripPlaceResponse result = tripPlaceService.addPlace(1L, request);

        assertThat(result.googlePlaceId()).isEqualTo("ChIJxxx");
        assertThat(result.name()).isEqualTo("오설록 티 뮤지엄");
        assertThat(result.status()).isEqualTo(TripPlaceStatus.CANDIDATE);
        then(placeRepository).should().save(any(Place.class));
        then(tripPlaceRepository).should().save(any(TripPlace.class));
    }

    @Test
    @DisplayName("t2 places에 이미 존재하는 장소를 추가하면 places 저장 없이 trip_places에만 등록한다")
    void t2_기존장소추가시places저장생략() {
        AddTripPlaceRequest request = new AddTripPlaceRequest(
                "ChIJxxx", "오설록 티 뮤지엄", "제주 서귀포시 신화역사로 15",
                33.3065, 126.2897, "tourist_attraction", null, null);

        given(placeRepository.findByGooglePlaceId("ChIJxxx")).willReturn(Optional.of(savedPlace));
        given(tripPlaceRepository.existsByTripIdAndPlaceId(1L, savedPlace.getId())).willReturn(false);
        given(tripPlaceRepository.save(any(TripPlace.class))).willReturn(savedTripPlace);

        tripPlaceService.addPlace(1L, request);

        then(placeRepository).should(never()).save(any(Place.class));
        then(tripPlaceRepository).should().save(any(TripPlace.class));
    }

    @Test
    @DisplayName("t3 같은 여행방에 이미 추가된 장소를 재추가하면 TRIP_PLACE_ALREADY_EXISTS 예외가 발생한다")
    void t3_중복장소추가시예외발생() {
        AddTripPlaceRequest request = new AddTripPlaceRequest(
                "ChIJxxx", "오설록 티 뮤지엄", "제주 서귀포시 신화역사로 15",
                33.3065, 126.2897, "tourist_attraction", null, null);

        given(placeRepository.findByGooglePlaceId("ChIJxxx")).willReturn(Optional.of(savedPlace));
        given(tripPlaceRepository.existsByTripIdAndPlaceId(1L, savedPlace.getId())).willReturn(true);

        assertThatThrownBy(() -> tripPlaceService.addPlace(1L, request))
                .isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(((BusinessException) e).getErrorCode())
                        .isEqualTo(PlaceErrorCode.TRIP_PLACE_ALREADY_EXISTS));
        then(tripPlaceRepository).should(never()).save(any(TripPlace.class));
    }

    @Test
    @DisplayName("t4 여행방 장소 전체 목록을 조회한다")
    void t4_전체장소목록조회() {
        given(tripPlaceRepository.findByTripId(1L)).willReturn(List.of(savedTripPlace));

        List<TripPlaceResponse> result = tripPlaceService.getPlaces(1L, null);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).googlePlaceId()).isEqualTo("ChIJxxx");
    }

    @Test
    @DisplayName("t5 status 파라미터로 필터링된 장소 목록을 조회한다")
    void t5_status필터조회() {
        given(tripPlaceRepository.findByTripIdAndStatus(1L, TripPlaceStatus.CANDIDATE))
                .willReturn(List.of(savedTripPlace));

        List<TripPlaceResponse> result = tripPlaceService.getPlaces(1L, TripPlaceStatus.CANDIDATE);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).status()).isEqualTo(TripPlaceStatus.CANDIDATE);
    }

    @Test
    @DisplayName("t6 여행방에 속한 장소를 삭제한다")
    void t6_장소삭제성공() {
        given(tripPlaceRepository.findByIdAndTripId(10L, 1L)).willReturn(Optional.of(savedTripPlace));

        tripPlaceService.deletePlace(1L, 10L);

        then(tripPlaceRepository).should().delete(savedTripPlace);
    }

    @Test
    @DisplayName("t7 존재하지 않는 장소를 삭제하면 TRIP_PLACE_NOT_FOUND 예외가 발생한다")
    void t7_존재하지않는장소삭제시예외발생() {
        given(tripPlaceRepository.findByIdAndTripId(99L, 1L)).willReturn(Optional.empty());

        assertThatThrownBy(() -> tripPlaceService.deletePlace(1L, 99L))
                .isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(((BusinessException) e).getErrorCode())
                        .isEqualTo(PlaceErrorCode.TRIP_PLACE_NOT_FOUND));
    }

    @Test
    @DisplayName("t8 장소 상태를 변경한다")
    void t8_장소상태변경성공() {
        given(tripPlaceRepository.findByIdAndTripId(10L, 1L)).willReturn(Optional.of(savedTripPlace));

        TripPlaceResponse result = tripPlaceService.updateStatus(1L, 10L,
                new UpdateStatusRequest(TripPlaceStatus.SAVED));

        assertThat(result.status()).isEqualTo(TripPlaceStatus.SAVED);
    }

    @Test
    @DisplayName("t9 장소 메모를 수정한다")
    void t9_장소메모수정성공() {
        given(tripPlaceRepository.findByIdAndTripId(10L, 1L)).willReturn(Optional.of(savedTripPlace));

        TripPlaceResponse result = tripPlaceService.updateNote(1L, 10L,
                new UpdateNoteRequest("오전에 방문 추천!"));

        assertThat(result.userNote()).isEqualTo("오전에 방문 추천!");
    }
}
