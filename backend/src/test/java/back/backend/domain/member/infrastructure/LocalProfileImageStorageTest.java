package back.backend.domain.member.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import back.backend.global.config.FileStorageProperties;
import back.backend.global.exception.BusinessException;
import back.backend.global.util.ImageTestFixtures;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;

class LocalProfileImageStorageTest {

    @TempDir
    Path tempDir;

    private LocalProfileImageStorage storage;

    @BeforeEach
    void setUp() {
        FileStorageProperties properties = new FileStorageProperties();
        properties.setUploadDir(tempDir.toString());
        storage = new LocalProfileImageStorage(properties);
    }

    @Test
    @DisplayName("t1 이미지 파일을 저장하면 접근 가능한 상대 경로 URL을 반환한다")
    void t1_storeSavesFileAndReturnsRelativeUrl() throws Exception {
        MockMultipartFile file =
                new MockMultipartFile("file", "profile.png", "image/png", ImageTestFixtures.validPngBytes());

        String url = storage.store(1L, file);

        assertThat(url).startsWith("/uploads/profile-images/1-").endsWith(".png");
        Path savedFile = tempDir.resolve("profile-images").resolve(url.substring(url.lastIndexOf('/') + 1));
        assertThat(Files.exists(savedFile)).isTrue();
    }

    @Test
    @DisplayName("t2 빈 파일을 저장하려 하면 예외가 발생한다")
    void t2_storeThrowsWhenFileIsEmpty() {
        MockMultipartFile file = new MockMultipartFile("file", "profile.png", "image/png", new byte[0]);

        assertThatThrownBy(() -> storage.store(1L, file))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("t3 허용되지 않는 확장자를 저장하려 하면 예외가 발생한다")
    void t3_storeThrowsWhenExtensionNotAllowed() {
        MockMultipartFile file =
                new MockMultipartFile("file", "profile.txt", "text/plain", "not-an-image".getBytes());

        assertThatThrownBy(() -> storage.store(1L, file))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("t4 5MB를 초과하는 파일을 저장하려 하면 예외가 발생한다")
    void t4_storeThrowsWhenFileTooLarge() {
        byte[] tooLarge = new byte[5 * 1024 * 1024 + 1];
        MockMultipartFile file = new MockMultipartFile("file", "profile.png", "image/png", tooLarge);

        assertThatThrownBy(() -> storage.store(1L, file))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("t5 확장자와 Content-Type을 이미지로 위장해도 실제 내용이 이미지가 아니면 저장하지 않는다")
    void t5_storeThrowsWhenContentTypeAndExtensionAreSpoofed() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "profile.png", "image/png", "<script>alert(1)</script>".getBytes());

        assertThatThrownBy(() -> storage.store(1L, file))
                .isInstanceOf(BusinessException.class);
    }
}
