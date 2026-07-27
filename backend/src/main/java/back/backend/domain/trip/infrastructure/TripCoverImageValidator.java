package back.backend.domain.trip.infrastructure;

import back.backend.domain.trip.exception.TripErrorCode;
import back.backend.global.exception.BusinessException;
import java.util.Locale;
import java.util.Map;
import org.springframework.web.multipart.MultipartFile;

final class TripCoverImageValidator {

    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024L;
    private static final Map<String, String> EXTENSIONS_BY_CONTENT_TYPE = Map.of(
            "image/jpeg", "jpg",
            "image/png", "png",
            "image/webp", "webp"
    );

    private TripCoverImageValidator() {
    }

    static ValidatedImage validate(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException(TripErrorCode.EMPTY_COVER_IMAGE);
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new BusinessException(TripErrorCode.COVER_IMAGE_TOO_LARGE);
        }
        String contentType = file.getContentType();
        String extension = contentType == null
                ? null
                : EXTENSIONS_BY_CONTENT_TYPE.get(contentType.toLowerCase(Locale.ROOT));
        if (extension == null) {
            throw new BusinessException(TripErrorCode.INVALID_COVER_IMAGE_TYPE);
        }
        return new ValidatedImage(contentType, extension);
    }

    record ValidatedImage(String contentType, String extension) {
    }
}
