package back.backend.global.util;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import javax.imageio.ImageIO;

/**
 * 매직 바이트/실제 디코딩 검증을 통과하는 최소 크기의 유효한 이미지 바이트를 만들어 준다.
 * {@link ImageContentInspector}가 파일 내용을 실제로 검사하므로, 테스트에서도
 * 임의의 문자열이 아닌 진짜 이미지 바이트를 사용해야 한다.
 */
public final class ImageTestFixtures {

    private ImageTestFixtures() {
    }

    public static byte[] validPngBytes() {
        return encode("png");
    }

    public static byte[] validJpegBytes() {
        return encode("jpg");
    }

    /**
     * ImageIO는 WebP를 쓰지 못하므로(twelvemonkeys imageio-webp는 읽기 전용이다),
     * 실제 2x2 빨간색 이미지를 인코딩한 진짜 VP8L(무손실) WebP 바이트를 그대로 담아 둔다.
     * (Pillow로 생성 후 검증한 값이며, 매직 바이트뿐 아니라 디코딩까지 통과한다.)
     */
    public static byte[] validWebpBytes() {
        return hexToBytes(
                "524946461c000000574542505650384c0f0000002f014000000710fd8ffe0722a2ff0100");
    }

    private static byte[] hexToBytes(String hex) {
        byte[] bytes = new byte[hex.length() / 2];
        for (int i = 0; i < bytes.length; i++) {
            bytes[i] = (byte) Integer.parseInt(hex.substring(i * 2, i * 2 + 2), 16);
        }
        return bytes;
    }

    private static byte[] encode(String formatName) {
        try {
            BufferedImage image = new BufferedImage(2, 2, BufferedImage.TYPE_INT_RGB);
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            if (!ImageIO.write(image, formatName, out)) {
                throw new IllegalStateException("등록된 " + formatName + " 이미지 writer가 없습니다.");
            }
            return out.toByteArray();
        } catch (IOException exception) {
            throw new UncheckedIOException(exception);
        }
    }
}
