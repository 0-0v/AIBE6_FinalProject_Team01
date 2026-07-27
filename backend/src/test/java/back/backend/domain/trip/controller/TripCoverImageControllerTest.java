package back.backend.domain.trip.controller;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import back.backend.domain.trip.dto.TripResponse;
import back.backend.domain.trip.entity.TripStatus;
import back.backend.domain.trip.entity.TripVisibility;
import back.backend.domain.trip.service.TripCoverImageService;
import back.backend.global.security.SecurityContextAccessor;
import java.util.Set;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@ExtendWith(MockitoExtension.class)
class TripCoverImageControllerTest {

    @Mock TripCoverImageService tripCoverImageService;
    @Mock SecurityContextAccessor securityContextAccessor;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(
                new TripCoverImageController(
                        tripCoverImageService,
                        securityContextAccessor
                )
        ).build();
    }

    @Test
    @DisplayName("t1 여행방 프로필 이미지를 등록하면 변경된 URL을 반환한다")
    void t1_uploadCoverImageReturnsUpdatedTrip() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "cover.png", "image/png", "image-content".getBytes());
        given(securityContextAccessor.getCurrentMemberId()).willReturn(1L);
        given(tripCoverImageService.update(eq(1L), eq(10L), any()))
                .willReturn(new TripResponse(
                        10L, 1L, "후쿠오카", null, Set.of(), "후쿠오카",
                        null, null, "/uploads/trip-cover-images/10/cover.png",
                        2L, TripStatus.PLANNING, TripVisibility.PRIVATE, null, null
                ));

        mockMvc.perform(multipart("/api/trips/10/cover-image").file(file))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.coverImageUrl")
                        .value("/uploads/trip-cover-images/10/cover.png"));
    }
}
