package back.backend.domain.trip.infrastructure;

import static org.assertj.core.api.Assertions.*;

import back.backend.domain.trip.exception.TripErrorCode;
import back.backend.global.config.FileStorageProperties;
import back.backend.global.exception.BusinessException;
import back.backend.global.util.ImageTestFixtures;
import java.nio.file.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;

class LocalTripCoverImageStorageTest {

    @TempDir
    Path tempDirectory;

    private LocalTripCoverImageStorage storage;

    @BeforeEach
    void setUp() {
        FileStorageProperties properties = new FileStorageProperties();
        properties.setUploadDir(tempDirectory.toString());
        storage = new LocalTripCoverImageStorage(properties);
    }

    @Test
    @DisplayName("t1 여행방 이미지를 저장하면 여행방별 공개 경로와 실제 파일을 생성한다")
    void t1_storeCoverImageReturnsUrlAndCreatesFile() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "cover.png", "image/png", ImageTestFixtures.validPngBytes());

        String imageUrl = storage.store(7L, 3L, file);

        assertThat(imageUrl)
                .startsWith("/uploads/trip-cover-images/7/")
                .endsWith(".png");
        assertThat(tempDirectory.resolve(imageUrl.replace("/uploads/", "")))
                .exists();
    }

    @Test
    @DisplayName("t2 이미지가 아닌 파일은 여행방 프로필로 저장하지 않는다")
    void t2_storeNonImageThrowsException() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "cover.txt", "text/plain", "text".getBytes());

        assertThatThrownBy(() -> storage.store(7L, 3L, file))
                .isInstanceOf(BusinessException.class)
                .extracting(exception -> ((BusinessException) exception).getErrorCode())
                .isEqualTo(TripErrorCode.INVALID_COVER_IMAGE_TYPE);
    }

    @Test
    @DisplayName("t3 확장자와 Content-Type을 이미지로 위장해도 실제 내용이 이미지가 아니면 저장하지 않는다")
    void t3_storeThrowsWhenContentTypeAndExtensionAreSpoofed() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "cover.png", "image/png", "<script>alert(1)</script>".getBytes());

        assertThatThrownBy(() -> storage.store(7L, 3L, file))
                .isInstanceOf(BusinessException.class)
                .extracting(exception -> ((BusinessException) exception).getErrorCode())
                .isEqualTo(TripErrorCode.INVALID_COVER_IMAGE_TYPE);
    }
}
