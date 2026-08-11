package back.backend.domain.admin.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import back.backend.domain.admin.entity.TripCoverPreset;
import back.backend.domain.admin.repository.AdminActionLogRepository;
import back.backend.domain.admin.repository.TripCoverPresetRepository;
import back.backend.domain.trip.port.TripCoverImageStorage;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class AdminTripCoverPresetServiceTest {
    @Mock TripCoverPresetRepository repository;
    @Mock TripCoverImageStorage storage;
    @Mock AdminActionLogRepository actionLogRepository;

    @Test
    @DisplayName("t1 관리자가 커버 이미지를 추가하면 저장소에 업로드하고 활성 프리셋으로 등록한다")
    void t1_addUploadsAndRegistersActivePreset() {
        AdminTripCoverPresetService service = new AdminTripCoverPresetService(
                repository, storage, actionLogRepository);
        MockMultipartFile file = new MockMultipartFile(
                "file", "cover.jpg", "image/jpeg", "image".getBytes());
        when(storage.store(0L, 1L, file)).thenReturn("/uploads/trip-cover-images/0/cover.jpg");
        when(repository.count()).thenReturn(11L);
        when(repository.save(org.mockito.ArgumentMatchers.any(TripCoverPreset.class)))
                .thenAnswer(invocation -> {
                    TripCoverPreset preset = invocation.getArgument(0);
                    ReflectionTestUtils.setField(preset, "id", 12L);
                    return preset;
                });

        var response = service.add(1L, file);

        assertThat(response.id()).isEqualTo(12L);
        assertThat(response.active()).isTrue();
        assertThat(response.imageUrl()).contains("/uploads/trip-cover-images/");
        verify(actionLogRepository).save(org.mockito.ArgumentMatchers.any());
    }
}
