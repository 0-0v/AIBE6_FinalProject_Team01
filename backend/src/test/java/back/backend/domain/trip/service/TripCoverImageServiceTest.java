package back.backend.domain.trip.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

import back.backend.domain.collaboration.activitylog.service.ActivityLogService;
import back.backend.domain.trip.entity.Trip;
import back.backend.domain.trip.entity.TripStatus;
import back.backend.domain.trip.port.TripCoverImageStorage;
import back.backend.domain.trip.repository.*;
import java.time.LocalDate;
import java.util.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

@ExtendWith(MockitoExtension.class)
class TripCoverImageServiceTest {

    @Mock TripRepository tripRepository;
    @Mock TripMemberRepository tripMemberRepository;
    @Mock TripCoverImageStorage imageStorage;
    @Mock ActivityLogService activityLogService;

    private TripCoverImageService service;

    @BeforeEach
    void setUp() {
        service = new TripCoverImageService(
                tripRepository,
                tripMemberRepository,
                imageStorage,
                activityLogService
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
}
