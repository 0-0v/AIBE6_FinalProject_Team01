package back.backend.global.util;

import static org.assertj.core.api.Assertions.assertThat;

import back.backend.global.util.ImageContentInspector.ImageFormat;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class ImageContentInspectorTest {

    @Test
    @DisplayName("t1 실제 PNG 바이트는 PNG로 감지되고 디코딩도 가능하다")
    void t1_detectsAndDecodesValidPng() {
        byte[] bytes = ImageTestFixtures.validPngBytes();

        assertThat(ImageContentInspector.detectFormat(bytes)).contains(ImageFormat.PNG);
        assertThat(ImageContentInspector.isDecodableRasterImage(bytes)).isTrue();
    }

    @Test
    @DisplayName("t2 실제 JPEG 바이트는 JPEG로 감지되고 디코딩도 가능하다")
    void t2_detectsAndDecodesValidJpeg() {
        byte[] bytes = ImageTestFixtures.validJpegBytes();

        assertThat(ImageContentInspector.detectFormat(bytes)).contains(ImageFormat.JPEG);
        assertThat(ImageContentInspector.isDecodableRasterImage(bytes)).isTrue();
    }

    @Test
    @DisplayName("t3 실제 WebP 바이트는 WEBP로 감지되고 디코딩도 가능하다")
    void t3_detectsAndDecodesValidWebp() {
        byte[] bytes = ImageTestFixtures.validWebpBytes();

        assertThat(ImageContentInspector.detectFormat(bytes)).contains(ImageFormat.WEBP);
        assertThat(ImageContentInspector.isDecodableRasterImage(bytes)).isTrue();
    }

    @Test
    @DisplayName("t4 확장자와 Content-Type만 이미지로 위장한 텍스트 파일은 어떤 형식으로도 감지되지 않는다")
    void t4_doesNotDetectSpoofedNonImageContent() {
        byte[] bytes = "<script>alert(1)</script>".getBytes(StandardCharsets.UTF_8);

        assertThat(ImageContentInspector.detectFormat(bytes)).isEmpty();
    }

    @Test
    @DisplayName("t5 PNG 매직 바이트만 흉내 내고 내용이 손상된 파일은 실제 디코딩에 실패한다")
    void t5_rejectsTruncatedPngThatFailsToDecode() {
        byte[] validPng = ImageTestFixtures.validPngBytes();
        byte[] truncated = new byte[16];
        System.arraycopy(validPng, 0, truncated, 0, truncated.length);

        assertThat(ImageContentInspector.detectFormat(truncated)).contains(ImageFormat.PNG);
        assertThat(ImageContentInspector.isDecodableRasterImage(truncated)).isFalse();
    }

    @Test
    @DisplayName("t6 RIFF/WEBP 매직 바이트만 흉내 내고 내용이 손상된 파일은 실제 디코딩에 실패한다")
    void t6_rejectsTruncatedWebpThatFailsToDecode() {
        byte[] validWebp = ImageTestFixtures.validWebpBytes();
        byte[] truncated = new byte[16];
        System.arraycopy(validWebp, 0, truncated, 0, truncated.length);

        assertThat(ImageContentInspector.detectFormat(truncated)).contains(ImageFormat.WEBP);
        assertThat(ImageContentInspector.isDecodableRasterImage(truncated)).isFalse();
    }

    @Test
    @DisplayName("t7 빈 배열이나 너무 짧은 바이트는 어떤 형식으로도 감지되지 않는다")
    void t7_doesNotDetectEmptyOrTooShortContent() {
        assertThat(ImageContentInspector.detectFormat(new byte[0])).isEmpty();
        assertThat(ImageContentInspector.detectFormat(new byte[] {1, 2})).isEmpty();
    }
}
