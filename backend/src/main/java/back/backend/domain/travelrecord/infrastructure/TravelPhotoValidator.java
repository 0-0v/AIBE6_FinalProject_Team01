package back.backend.domain.travelrecord.infrastructure;

import back.backend.domain.travelrecord.exception.TravelRecordErrorCode;
import back.backend.global.exception.BusinessException;
import back.backend.global.util.ImageContentInspector;
import back.backend.global.util.ImageContentInspector.ImageFormat;
import java.io.IOException;
import org.springframework.web.multipart.MultipartFile;

final class TravelPhotoValidator {

    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024L;

    private TravelPhotoValidator() {
    }

    static ValidatedPhoto validate(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException(TravelRecordErrorCode.EMPTY_PHOTO);
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new BusinessException(TravelRecordErrorCode.PHOTO_TOO_LARGE);
        }

        byte[] content;
        try {
            content = file.getBytes();
        } catch (IOException exception) {
            throw new BusinessException(TravelRecordErrorCode.PHOTO_STORAGE_FAILED);
        }

        // 확장자와 Content-Type 헤더는 클라이언트가 조작할 수 있으므로 신뢰하지 않고,
        // 파일의 실제 매직 바이트로 형식을 판별한다.
        ImageFormat format = ImageContentInspector.detectFormat(content)
                .orElseThrow(() -> new BusinessException(TravelRecordErrorCode.INVALID_PHOTO_TYPE));
        if (!ImageContentInspector.isDecodableRasterImage(content)) {
            throw new BusinessException(TravelRecordErrorCode.INVALID_PHOTO_TYPE);
        }

        return new ValidatedPhoto(format.contentType(), format.extension());
    }

    record ValidatedPhoto(String contentType, String extension) {
    }
}
