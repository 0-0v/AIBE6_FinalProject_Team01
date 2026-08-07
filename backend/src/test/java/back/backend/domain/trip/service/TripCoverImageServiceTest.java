package back.backend.domain.trip.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

import back.backend.domain.collaboration.activitylog.service.ActivityLogService;
import back.backend.domain.trip.entity.Trip;
import back.backend.domain.trip.entity.TripStatus;
import back.backend.domain.trip.exception.TripErrorCode;
import back.backend.domain.trip.port.TripCoverImageStorage;
import back.backend.domain.trip.repository.*;
import back.backend.global.config.FrontendProperties;
import back.backend.global.exception.BusinessException;
import java.time.LocalDate;
import java.util.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

@ExtendWith(MockitoExtension.class)
class TripCoverImageServiceTest {

    @Mock TripRepository tripRepository;
    @Mock TripMemberRepository tripMemberRepository;
    @Mock TripCoverImageStorage imageStorage;
    @Mock ActivityLogService activityLogService;

    private TripCoverImageService service;

    @BeforeEach
    void setUp() {
        FrontendProperties frontendProperties = new FrontendProperties();
        frontendProperties.setFrontendBaseUrl("https://plamingo.example.com");
        service = new TripCoverImageService(
                tripRepository,
                tripMemberRepository,
                imageStorage,
                activityLogService,
                frontendProperties
        );
    }

    @Test
    @DisplayName("t1 여행방 멤버가 이미지를 등록하면 여행방 프로필 URL을 변경한다")
    void t1_ownerUpdatesTripCoverImage() {
        Trip trip = Trip.create(
                1L, "후쿠오카", null, Set.of(), "후쿠오카",
                LocalDate.of(2026, 7, 23), LocalDate.of(2026, 7, 28)
        );
        MockMultipartFile file = new MockMultipartFile(
                "file", "cover.png", "image/png", "image-content".getBytes());
        String imageUrl = "/uploads/trip-cover-images/10/cover.png";
        given(tripRepository.findByIdAndMemberIdAndStatusNot(
                10L, 1L, TripStatus.CANCELLED)).willReturn(Optional.of(trip));
        given(imageStorage.store(10L, 1L, file)).willReturn(imageUrl);
        given(tripMemberRepository.countByTripId(10L)).willReturn(2L);

        var response = service.update(1L, 10L, file);

        assertThat(trip.getCoverImageUrl()).isEqualTo(imageUrl);
        assertThat(response.coverImageUrl()).isEqualTo(imageUrl);
        verify(activityLogService).create(ArgumentMatchers.any());
    }

    @Test
    @DisplayName("t2 여행방 멤버가 기본 이미지를 선택하면 프론트엔드 기준 절대 URL로 커버를 변경한다")
    void t2_ownerSelectsPresetCoverImage() {
        Trip trip = Trip.create(
                1L, "후쿠오카", null, Set.of(), "후쿠오카",
                LocalDate.of(2026, 7, 23), LocalDate.of(2026, 7, 28)
        );
        given(tripRepository.findByIdAndMemberIdAndStatusNot(
                10L, 1L, TripStatus.CANCELLED)).willReturn(Optional.of(trip));
        given(tripMemberRepository.countByTripId(10L)).willReturn(2L);

        var response = service.updateWithPreset(1L, 10L, "PRESET_3");

        String expectedUrl = "https://plamingo.example.com/assets/trip-covers/trip-cover-03.jpg";
        assertThat(trip.getCoverImageUrl()).isEqualTo(expectedUrl);
        assertThat(response.coverImageUrl()).isEqualTo(expectedUrl);
        verify(activityLogService).create(ArgumentMatchers.any());
    }

    @Test
    @DisplayName("t3 존재하지 않는 프리셋 키를 선택하면 예외가 발생하고 커버는 변경되지 않는다")
    void t3_selectingUnknownPresetKeyThrowsException() {
        Trip trip = Trip.create(
                1L, "후쿠오카", null, Set.of(), "후쿠오카",
                LocalDate.of(2026, 7, 23), LocalDate.of(2026, 7, 28)
        );
        given(tripRepository.findByIdAndMemberIdAndStatusNot(
                10L, 1L, TripStatus.CANCELLED)).willReturn(Optional.of(trip));

        assertThatThrownBy(() -> service.updateWithPreset(1L, 10L, "NOT_A_PRESET"))
                .isInstanceOf(BusinessException.class);
        assertThat(trip.getCoverImageUrl()).isNull();
    }

    @Test
    @DisplayName("t4 존재하지 않는 여행방에 프리셋을 지정하면 예외가 발생한다")
    void t4_selectingPresetForMissingTripThrowsException() {
        given(tripRepository.findByIdAndMemberIdAndStatusNot(
                10L, 1L, TripStatus.CANCELLED)).willReturn(Optional.empty());

        assertThatThrownBy(() -> service.updateWithPreset(1L, 10L, "PRESET_1"))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", TripErrorCode.TRIP_NOT_FOUND);
    }
}
