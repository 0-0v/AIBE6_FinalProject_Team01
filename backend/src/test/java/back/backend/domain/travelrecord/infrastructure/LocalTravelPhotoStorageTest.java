package back.backend.domain.travelrecord.infrastructure;

import static org.assertj.core.api.Assertions.*;

import back.backend.domain.travelrecord.exception.TravelRecordErrorCode;
import back.backend.global.config.FileStorageProperties;
import back.backend.global.exception.BusinessException;
import java.nio.file.Path;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;

class LocalTravelPhotoStorageTest {

    @TempDir
    Path tempDirectory;

    private LocalTravelPhotoStorage storage;

    @BeforeEach
    void setUp() {
        FileStorageProperties properties = new FileStorageProperties();
        properties.setUploadDir(tempDirectory.toString());
        storage = new LocalTravelPhotoStorage(properties);
    }

    @Test
    @DisplayName("t1 이미지 파일을 저장하면 여행방별 공개 경로를 반환한다")
    void t1_storeImageReturnsTripScopedUrl() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "record.png", "image/png", "image-content".getBytes());

        String imageUrl = storage.store(7L, 3L, file);

        assertThat(imageUrl)
                .startsWith("/uploads/travel-records/7/")
                .endsWith(".png");
    }

    @Test
    @DisplayName("t2 이미지가 아닌 파일은 저장하지 않는다")
    void t2_storeNonImageThrowsException() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "record.txt", "text/plain", "text".getBytes());

        assertThatThrownBy(() -> storage.store(7L, 3L, file))
                .isInstanceOf(BusinessException.class)
                .extracting(exception -> ((BusinessException) exception).getErrorCode())
                .isEqualTo(TravelRecordErrorCode.INVALID_PHOTO_TYPE);
    }
}
