package back.backend.domain.trip.infrastructure;

import back.backend.domain.trip.exception.TripErrorCode;
import back.backend.domain.trip.port.TripCoverImageStorage;
import back.backend.global.config.FileStorageProperties;
import back.backend.global.exception.BusinessException;
import java.io.IOException;
import java.nio.file.*;
import java.util.UUID;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

@Component
@ConditionalOnProperty(
        name = "app.file-storage.type",
        havingValue = "local",
        matchIfMissing = true
)
public class LocalTripCoverImageStorage implements TripCoverImageStorage {

    private static final String SUB_DIRECTORY = "trip-cover-images";
    private final FileStorageProperties properties;

    public LocalTripCoverImageStorage(FileStorageProperties properties) {
        this.properties = properties;
    }

    @Override
    public String store(Long tripId, Long memberId, MultipartFile file) {
        var image = TripCoverImageValidator.validate(file);
        String filename = UUID.randomUUID() + "." + image.extension();
        Path directory = Path.of(
                properties.getUploadDir(),
                SUB_DIRECTORY,
                String.valueOf(tripId)
        ).toAbsolutePath().normalize();
        Path destination = directory.resolve(filename).normalize();
        if (!destination.startsWith(directory)) {
            throw new BusinessException(TripErrorCode.COVER_IMAGE_STORAGE_FAILED);
        }
        try {
            Files.createDirectories(directory);
            file.transferTo(destination);
        } catch (IOException exception) {
            throw new BusinessException(TripErrorCode.COVER_IMAGE_STORAGE_FAILED);
        }
        return "/uploads/" + SUB_DIRECTORY + "/" + tripId + "/" + filename;
    }
}
