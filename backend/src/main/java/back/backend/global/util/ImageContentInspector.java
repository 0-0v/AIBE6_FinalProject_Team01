package back.backend.global.util;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Optional;
import javax.imageio.ImageIO;

/**
 * 업로드된 이미지 파일의 실제 형식을 파일 확장자나 클라이언트가 보낸 Content-Type이 아니라
 * 파일 내용(매직 바이트)으로 판별한다. 확장자와 Content-Type은 클라이언트가 임의로
 * 조작할 수 있으므로, 실제 저장/응답에 사용할 형식은 반드시 이 클래스가 감지한 값을 써야 한다.
 */
public final class ImageContentInspector {

    private static final byte[] PNG_SIGNATURE = {
            (byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A
    };

    private ImageContentInspector() {
    }

    public enum ImageFormat {
        JPEG("image/jpeg", "jpg"),
        PNG("image/png", "png"),
        WEBP("image/webp", "webp");

        private final String contentType;
        private final String extension;

        ImageFormat(String contentType, String extension) {
            this.contentType = contentType;
            this.extension = extension;
        }

        public String contentType() {
            return contentType;
        }

        public String extension() {
            return extension;
        }
    }

    /**
     * 파일 바이트의 매직 넘버를 검사해 실제 이미지 형식을 판별한다.
     * 확장자·Content-Type 헤더는 전혀 참고하지 않는다.
     */
    public static Optional<ImageFormat> detectFormat(byte[] bytes) {
        if (isJpeg(bytes)) {
            return Optional.of(ImageFormat.JPEG);
        }
        if (isPng(bytes)) {
            return Optional.of(ImageFormat.PNG);
        }
        if (isWebp(bytes)) {
            return Optional.of(ImageFormat.WEBP);
        }
        return Optional.empty();
    }

    /**
     * ImageIO로 실제 디코딩이 가능한지 확인한다.
     * 매직 바이트만 흉내 내고 내용이 손상되었거나 이미지가 아닌 파일을 걸러낸다.
     * JPEG/PNG는 JDK 기본 리더로, WebP는 twelvemonkeys imageio-webp 리더로 디코딩된다.
     */
    public static boolean isDecodableRasterImage(byte[] bytes) {
        try (ByteArrayInputStream input = new ByteArrayInputStream(bytes)) {
            return ImageIO.read(input) != null;
        } catch (IOException exception) {
            return false;
        }
    }

    private static boolean isJpeg(byte[] b) {
        return b.length >= 3
                && (b[0] & 0xFF) == 0xFF
                && (b[1] & 0xFF) == 0xD8
                && (b[2] & 0xFF) == 0xFF;
    }

    private static boolean isPng(byte[] b) {
        if (b.length < PNG_SIGNATURE.length) {
            return false;
        }
        for (int i = 0; i < PNG_SIGNATURE.length; i++) {
            if (b[i] != PNG_SIGNATURE[i]) {
                return false;
            }
        }
        return true;
    }

    private static boolean isWebp(byte[] b) {
        if (b.length < 16) {
            return false;
        }
        boolean isRiffContainer = b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F'
                && b[8] == 'W' && b[9] == 'E' && b[10] == 'B' && b[11] == 'P';
        if (!isRiffContainer) {
            return false;
        }
        String subFormat = new String(b, 12, 4, StandardCharsets.US_ASCII);
        return subFormat.equals("VP8 ") || subFormat.equals("VP8L") || subFormat.equals("VP8X");
    }
}
