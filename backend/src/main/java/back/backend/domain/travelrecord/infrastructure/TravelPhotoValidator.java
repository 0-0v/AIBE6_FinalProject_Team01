package back.backend.domain.travelrecord.infrastructure;

import back.backend.domain.travelrecord.exception.TravelRecordErrorCode;
import back.backend.global.exception.BusinessException;
import java.util.Locale;
import java.util.Map;
import org.springframework.web.multipart.MultipartFile;

final class TravelPhotoValidator {

    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024L;
    private static final Map<String, String> EXTENSIONS_BY_CONTENT_TYPE = Map.of(
            "image/jpeg", "jpg",
            "image/png", "png",
            "image/webp", "webp"
    );

    private TravelPhotoValidator() {
    }

    static ValidatedPhoto validate(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException(TravelRecordErrorCode.EMPTY_PHOTO);
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new BusinessException(TravelRecordErrorCode.PHOTO_TOO_LARGE);
        }
        String contentType = file.getContentType();
        String extension = contentType == null
                ? null
                : EXTENSIONS_BY_CONTENT_TYPE.get(contentType.toLowerCase(Locale.ROOT));
        if (extension == null) {
            throw new BusinessException(TravelRecordErrorCode.INVALID_PHOTO_TYPE);
        }
        return new ValidatedPhoto(contentType, extension);
    }

    record ValidatedPhoto(String contentType, String extension) {
    }
}
