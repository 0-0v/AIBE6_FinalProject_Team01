package back.backend.domain.travelrecord.infrastructure;

import back.backend.domain.travelrecord.exception.TravelRecordErrorCode;
import back.backend.domain.travelrecord.port.TravelPhotoStorage;
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
public class LocalTravelPhotoStorage implements TravelPhotoStorage {

    private static final String SUB_DIRECTORY = "travel-records";
    private final FileStorageProperties properties;

    public LocalTravelPhotoStorage(FileStorageProperties properties) {
        this.properties = properties;
    }

    @Override
    public String store(Long tripId, Long memberId, MultipartFile file) {
        TravelPhotoValidator.ValidatedPhoto photo = TravelPhotoValidator.validate(file);
        String filename = UUID.randomUUID() + "." + photo.extension();
        Path directory = Path.of(
                properties.getUploadDir(),
                SUB_DIRECTORY,
                String.valueOf(tripId)
        ).toAbsolutePath().normalize();
        Path destination = directory.resolve(filename).normalize();
        if (!destination.startsWith(directory)) {
            throw new BusinessException(TravelRecordErrorCode.PHOTO_STORAGE_FAILED);
        }
        try {
            Files.createDirectories(directory);
            file.transferTo(destination);
        } catch (IOException exception) {
            throw new BusinessException(TravelRecordErrorCode.PHOTO_STORAGE_FAILED);
        }
        return "/uploads/" + SUB_DIRECTORY + "/" + tripId + "/" + filename;
    }
}
